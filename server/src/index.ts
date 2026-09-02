import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import dns from "dns";
import { readFileSync, existsSync, createReadStream } from "fs";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { Hono } from "hono";
import {
  cleanupExpiredLocalExports,
  getLocalFilePath,
  uploadStreamToStorage,
} from "./lib/storage";

// Prefer IPv4 first to avoid IPv6 DNS lookup delays on macOS
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore if not supported in older Node versions
}
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stream, streamSSE } from "hono/streaming";
import { config } from "./lib/config";
import { createJob, getJob, Job, addLog, updateJob } from "./lib/jobManager";
import {
  classifyTelemetryError,
  posthog,
  RELAY_HOP_HEADER,
  resolveDeployment,
  resolveEnvironment,
  trackEvent,
} from "./lib/telemetry";
import { getDatabaseAdapter, DatabaseType } from "./databases";
import {
  BrowserServiceError,
  listBrowserObjects,
  previewBrowserObject,
} from "./services/browser";
import {
  getTestimonials,
  addTestimonial,
  type ITestimonial,
} from "./lib/testimonialStore";

// Handle unhandled rejections to prevent process crash
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-DB-Mover-Visitor", "X-DB-Mover-Session"],
    maxAge: 86400,
  }),
);

// API Routes
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getTelemetryIdentity = (c: { req: { header: (name: string) => string | undefined } }) => {
  const visitorId = c.req.header("x-db-mover-visitor");
  const sessionId = c.req.header("x-db-mover-session");
  return {
    visitorId: visitorId && UUID_PATTERN.test(visitorId) ? visitorId : undefined,
    sessionId: sessionId && UUID_PATTERN.test(sessionId) ? sessionId : undefined,
    deployment: resolveDeployment(c.req.header("host")),
  };
};

// Driver errors can contain connection strings, so expose only a safe, actionable summary.
const getSafeOperationError = (error: unknown): string => {
  switch (classifyTelemetryError(error)) {
    case "auth_failed":
      return "Database authentication failed.";
    case "host_not_found":
      return "Database host could not be found.";
    case "connection_refused":
    case "network_unreachable":
      return "Could not connect to the database.";
    case "connection_timeout":
      return "Database connection timed out.";
    case "tls_error":
      return "Database TLS connection failed.";
    case "permission_denied":
      return "Database permission was denied.";
    case "database_not_found":
      return "The requested database was not found.";
    case "invalid_uri":
      return "The database connection string is invalid.";
    case "aborted":
      return "The database operation was cancelled.";
    case "unsupported_operation":
      return "This database operation is not supported.";
    default:
      return "The database operation failed. Check the database connection and try again.";
  }
};

// ── Telemetry relay ────────────────────────────────────────────────────────
// This endpoint is public and unauthenticated by necessity, and it writes to the numbers
// published on /stats. Everything below exists to keep it from being a free megaphone.

/**
 * Events this relay accepts: browser events posted directly, plus operation events forwarded by
 * self-hosted servers that have no PostHog project of their own. Anything else is dropped.
 */
const RELAYABLE_EVENTS = new Set([
  "app_opened",
  "page_viewed",
  "landing_cta_clicked",
  "database_selected",
  "mode_selected",
  "connection_verified",
  "connection_verification_failed",
  "browser_preview_loaded",
  "browser_preview_failed",
  "operation_started",
  "operation_completed",
  "operation_failed",
  "browser_schema_loaded",
  "browser_schema_failed",
]);

/** Property keys a sender may set. Unknown keys are dropped rather than forwarded. */
const RELAYABLE_PROPERTIES = new Set([
  "sessionId",
  "currentRoute",
  "referrerHost",
  "screenWidth",
  "databaseType",
  "mode",
  "durationMs",
  "operationId",
  "status",
  "errorCode",
  "retryCount",
  "recordsProcessed",
  "objectsProcessed",
  "outputBytes",
]);

const RELAYABLE_ERROR_CODES = new Set([
  "auth_failed",
  "host_not_found",
  "connection_refused",
  "connection_timeout",
  "tls_error",
  "permission_denied",
  "database_not_found",
  "invalid_uri",
  "network_unreachable",
  "aborted",
  "unsupported_operation",
  "unknown_error",
]);

/** Ceiling on reported counters, so a forged payload cannot move the published totals. */
const MAX_RELAYED_COUNT = 1e12;

const RELAYABLE_DATABASE_TYPES = new Set(["mongodb", "postgres", "mysql", "redis", "firebase"]);
const RELAYABLE_MODES = new Set(["copy", "download", "browser"]);

const TELEMETRY_MAX_BODY_BYTES = 4096;
const TELEMETRY_RATE_LIMIT = 120;
const TELEMETRY_RATE_WINDOW_MS = 60 * 1000;

const TESTIMONIAL_RATE_LIMIT = 5;
const TESTIMONIAL_RATE_WINDOW_MS = 10 * 60 * 1000;

type RateBucket = { count: number; resetAt: number };

const telemetryRateBuckets = new Map<string, RateBucket>();
const testimonialRateBuckets = new Map<string, RateBucket>();

const isRateLimited = (
  buckets: Map<string, RateBucket>,
  key: string,
  limit: number,
  windowMs: number,
): boolean => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
};

// x-forwarded-for is client-appendable, so trust x-real-ip (set solely by the reverse proxy) first;
// when only XFF is present, trust its last hop (the proxy's own append) rather than the spoofable first one.
const getClientKey = (c: { req: { header: (name: string) => string | undefined } }): string => {
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
};

/**
 * A browser cannot forge its own Origin, so that is the authority on where the sender runs.
 * Server-to-server forwards carry no Origin; those may only declare themselves self-hosted,
 * so nothing can talk its way into the hosted column.
 */
const resolveRelayDeployment = (origin: string | undefined, claimed: unknown) => {
  if (origin) {
    try {
      return resolveDeployment(new URL(origin).hostname);
    } catch {
      // Malformed Origin — fall through to the claim.
    }
  }
  return claimed === "self_hosted" ? "self_hosted" : resolveDeployment();
};

const sanitizeRelayedProperties = (input: unknown): Record<string, unknown> => {
  if (typeof input !== "object" || input === null) return {};
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!RELAYABLE_PROPERTIES.has(key)) continue;

    if (key === "databaseType") {
      if (typeof value === "string" && RELAYABLE_DATABASE_TYPES.has(value)) properties[key] = value;
      continue;
    }
    if (key === "mode") {
      if (typeof value === "string" && RELAYABLE_MODES.has(value)) properties[key] = value;
      continue;
    }
    if (key === "sessionId") {
      if (typeof value === "string" && UUID_PATTERN.test(value)) properties[key] = value;
      continue;
    }
    if (key === "errorCode") {
      if (typeof value === "string" && RELAYABLE_ERROR_CODES.has(value)) properties[key] = value;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value) && value >= 0 && value <= MAX_RELAYED_COUNT) properties[key] = value;
      continue;
    }
    if (typeof value === "string") {
      properties[key] = value.slice(0, 120);
    }
  }

  return properties;
};

app.post("/api/telemetry/event", async (c) => {
  if (isRateLimited(telemetryRateBuckets, getClientKey(c), TELEMETRY_RATE_LIMIT, TELEMETRY_RATE_WINDOW_MS)) {
    return c.json({ accepted: false, error: "Rate limit exceeded" }, 429);
  }

  const declaredLength = Number(c.req.header("content-length") || 0);
  if (declaredLength > TELEMETRY_MAX_BODY_BYTES) {
    return c.json({ accepted: false, error: "Payload too large" }, 413);
  }

  try {
    const raw = await c.req.text();
    if (raw.length > TELEMETRY_MAX_BODY_BYTES) {
      return c.json({ accepted: false, error: "Payload too large" }, 413);
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const distinctId = typeof body.distinctId === "string" ? body.distinctId : "";
    const event = typeof body.event === "string" ? body.event : "";

    if (!UUID_PATTERN.test(distinctId)) {
      return c.json({ accepted: false, error: "Invalid distinctId" }, 400);
    }
    if (!RELAYABLE_EVENTS.has(event)) {
      return c.json({ accepted: false, error: "Unknown event" }, 400);
    }

    // Loop backstop, independent of configuration: an event that already arrived via a
    // server-to-server forward is dropped rather than forwarded a second time. Without a PostHog
    // key this instance would otherwise relay it straight back out, potentially to its own URL.
    if (!posthog && c.req.header(RELAY_HOP_HEADER)) {
      return c.json({ accepted: false, error: "Relay loop prevented" }, 202);
    }

    trackEvent({
      distinctId,
      event,
      properties: sanitizeRelayedProperties(body.properties),
      deployment: resolveRelayDeployment(c.req.header("origin"), body.deployment),
      environment: resolveEnvironment(body.environment),
    });

    return c.json({ accepted: true }, 202);
  } catch {
    return c.json({ accepted: false, error: "Invalid telemetry payload" }, 400);
  }
});

type StatsRange = "7d" | "30d" | "90d" | "1y" | "all";

// Stats endpoint proxy (5 minute cache per selected range)
const cachedStats = new Map<StatsRange, { expiresAt: number; value: Record<string, unknown> }>();

app.get("/api/stats", async (c) => {
  const requestedRange = c.req.query("range");
  const range: StatsRange = ["7d", "30d", "90d", "1y", "all"].includes(requestedRange || "")
    ? requestedRange as StatsRange
    : "30d";
  const cachedRange = cachedStats.get(range);
  if (cachedRange && cachedRange.expiresAt > Date.now()) {
    return c.json(cachedRange.value);
  }

  const personalKey = config.posthog.personalApiKey;
  const projectId = config.posthog.projectId;
  const rawHost = config.posthog.host || "https://us.posthog.com";
  const apiHost = rawHost.replace(".i.posthog.com", ".posthog.com");
  const rangeIntervals: Record<Exclude<StatsRange, "all">, string> = {
    "7d": "INTERVAL 7 DAY",
    "30d": "INTERVAL 30 DAY",
    "90d": "INTERVAL 90 DAY",
    "1y": "INTERVAL 1 YEAR",
  };
  // Read back the same environment this process writes, so the public deployment publishes only
  // production usage while a local server still shows the events it just produced. The value is a
  // fixed union ('production' | 'development' | 'test'), never user input.
  const environmentFilter = `properties.environment = '${resolveEnvironment()}'`;
  const dateFilter =
    range === "all"
      ? `WHERE ${environmentFilter}`
      : `WHERE timestamp >= now() - ${rangeIntervals[range]} AND ${environmentFilter}`;

  const fallbackStats = {
    range,
    stale: true,
    generatedAt: new Date().toISOString(),
    traffic: { uniqueBrowsers: 0, sessions: 0, pageViews: 0 },
    installations: { active: 0, hosted: 0, selfHosted: 0, versions: [] },
    operations: { completed: 0, failed: 0, successRate: 100, copy: 0, download: 0, browser: 0 },
    throughput: {
      recordsProcessed: 0,
      objectsProcessed: 0,
      downloadBytes: 0,
      medianDurationMs: null,
      p95DurationMs: null,
    },
    trends: [],
    byDatabase: [
      { database: "mongodb", operations: 0, percentage: 0, successRate: 100 },
      { database: "postgres", operations: 0, percentage: 0, successRate: 100 },
      { database: "mysql", operations: 0, percentage: 0, successRate: 100 },
      { database: "redis", operations: 0, percentage: 0, successRate: 100 },
      { database: "firebase", operations: 0, percentage: 0, successRate: 100 },
    ],
    byDeployment: { hosted: 0, selfHosted: 0 },
  };

  if (!personalKey || !projectId) {
    return c.json(fallbackStats);
  }

  try {
    // One schema load represents a browser operation; any app open or finished operation makes a setup active.
    const totalsQuery = `
      SELECT
        countIf(event = 'operation_completed') as completed,
        countIf(event = 'operation_failed') as failed,
        countIf(event = 'operation_completed' AND properties.mode = 'copy') as copy,
        countIf(event = 'operation_completed' AND properties.mode = 'download') as download,
        countIf(event = 'browser_schema_loaded') as browser,
        sumIf(toIntOrZero(properties.recordsProcessed), event = 'operation_completed') as recordsProcessed,
        sumIf(toIntOrZero(properties.objectsProcessed), event = 'operation_completed') as objectsProcessed,
        sumIf(toIntOrZero(properties.outputBytes), event = 'operation_completed') as downloadBytes,
        uniqIf(distinct_id, event IN ('app_opened', 'page_viewed')) as uniqueBrowsers,
        countIf(event = 'page_viewed') as pageViews,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.databaseType = 'mongodb') as mongodbOperations,
        countIf(event = 'operation_completed' AND properties.databaseType = 'mongodb') as mongodbCompleted,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.databaseType = 'postgres') as postgresOperations,
        countIf(event = 'operation_completed' AND properties.databaseType = 'postgres') as postgresCompleted,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.databaseType = 'mysql') as mysqlOperations,
        countIf(event = 'operation_completed' AND properties.databaseType = 'mysql') as mysqlCompleted,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.databaseType = 'redis') as redisOperations,
        countIf(event = 'operation_completed' AND properties.databaseType = 'redis') as redisCompleted,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.databaseType = 'firebase') as firebaseOperations,
        countIf(event = 'operation_completed' AND properties.databaseType = 'firebase') as firebaseCompleted,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.deployment = 'hosted') as hostedOperations,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.deployment = 'self_hosted') as selfHostedOperations,
        quantileIf(0.5)(toIntOrZero(properties.durationMs), event IN ('operation_completed', 'operation_failed') AND properties.durationMs IS NOT NULL) as medianDurationMs,
        quantileIf(0.95)(toIntOrZero(properties.durationMs), event IN ('operation_completed', 'operation_failed') AND properties.durationMs IS NOT NULL) as p95DurationMs,
        countIf(event IN ('operation_completed', 'operation_failed') AND properties.durationMs IS NOT NULL) as durationCount,
        countIf(event = 'app_opened') as sessions,
        uniqIf(distinct_id, event IN ('app_opened', 'operation_completed', 'operation_failed', 'browser_schema_loaded', 'browser_schema_failed')) as activeInstallations,
        uniqIf(distinct_id, event IN ('app_opened', 'operation_completed', 'operation_failed', 'browser_schema_loaded', 'browser_schema_failed') AND properties.deployment = 'hosted') as hostedInstallations,
        uniqIf(distinct_id, event IN ('app_opened', 'operation_completed', 'operation_failed', 'browser_schema_loaded', 'browser_schema_failed') AND properties.deployment = 'self_hosted') as selfHostedInstallations
      FROM events
      ${dateFilter}
    `;

    const trendsQuery = `
      SELECT
        toString(toDate(timestamp)) as date,
        uniqIf(distinct_id, event IN ('app_opened', 'page_viewed')) as visitors,
        countIf(event = 'operation_completed' AND properties.mode = 'copy') as copy,
        countIf(event = 'operation_completed' AND properties.mode = 'download') as download,
        countIf(event = 'browser_schema_loaded') as browser
      FROM events
      ${dateFilter}
      GROUP BY date
      ORDER BY date
    `;

    const queryPostHog = async (query: string): Promise<Array<Array<unknown>>> => {
      const response = await fetch(`${apiHost}/api/projects/${projectId}/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${personalKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
        // PostHog query latency is highly variable (sub-second to several seconds). Results are
        // cached for 5 minutes, so waiting beats serving a false "cached data" banner.
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PostHog query API HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { results?: Array<Array<unknown>> };
      return data.results || [];
    };

    const [totalsResults, trendResults] = await Promise.all([
      queryPostHog(totalsQuery),
      queryPostHog(trendsQuery),
    ]);
    const row = totalsResults[0] || [];

    const completed = Number(row[0] || 0);
    const failed = Number(row[1] || 0);
    const total = completed + failed;
    const uniqueBrowsers = Number(row[8] || 0);
    const pageViews = Number(row[9] || 0);
    const durationCount = Number(row[24] || 0);
    const databaseCounts = [
      { database: "mongodb", operations: Number(row[10] || 0), completed: Number(row[11] || 0) },
      { database: "postgres", operations: Number(row[12] || 0), completed: Number(row[13] || 0) },
      { database: "mysql", operations: Number(row[14] || 0), completed: Number(row[15] || 0) },
      { database: "redis", operations: Number(row[16] || 0), completed: Number(row[17] || 0) },
      { database: "firebase", operations: Number(row[18] || 0), completed: Number(row[19] || 0) },
    ];

    const stats = {
      stale: false,
      range,
      generatedAt: new Date().toISOString(),
      traffic: {
        uniqueBrowsers,
        sessions: Number(row[25] || 0),
        pageViews,
      },
      installations: {
        active: Number(row[26] || 0),
        hosted: Number(row[27] || 0),
        selfHosted: Number(row[28] || 0),
        versions: [],
      },
      operations: {
        completed,
        failed,
        successRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 100,
        copy: Number(row[2] || 0),
        download: Number(row[3] || 0),
        browser: Number(row[4] || 0),
      },
      throughput: {
        recordsProcessed: Number(row[5] || 0),
        objectsProcessed: Number(row[6] || 0),
        downloadBytes: Number(row[7] || 0),
        medianDurationMs: durationCount > 0 ? Number(row[22]) : null,
        p95DurationMs: durationCount > 0 ? Number(row[23]) : null,
      },
      trends: trendResults.map((trend) => ({
        date: String(trend[0]),
        visitors: Number(trend[1] || 0),
        copy: Number(trend[2] || 0),
        download: Number(trend[3] || 0),
        browser: Number(trend[4] || 0),
      })),
      byDatabase: databaseCounts.map(({ database, operations, completed: databaseCompleted }) => ({
        database,
        operations,
        percentage: total > 0 ? Math.round((operations / total) * 1000) / 10 : 0,
        successRate: operations > 0
          ? Math.round((databaseCompleted / operations) * 1000) / 10
          : 100,
      })),
      byDeployment: {
        hosted: Number(row[20] || 0),
        selfHosted: Number(row[21] || 0),
      },
    };

    cachedStats.set(range, { expiresAt: Date.now() + 5 * 60 * 1000, value: stats });
    return c.json(stats);
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    console.error("Failed to query PostHog stats:", errorDetails);
    if (cachedRange) return c.json({ ...cachedRange.value, stale: true });
    return c.json(fallbackStats);
  }
});

// ── Testimonials endpoints ──────────────────────────────────────────────────
const TESTIMONIAL_VALID_DB_TYPES = new Set([
  "mongodb",
  "postgres",
  "mysql",
  "redis",
  "firebase",
  "general",
]);

// Returns the full list of community and seed testimonials.
app.get("/api/testimonials", async (c) => {
  const testimonials = await getTestimonials();
  return c.json({ success: true, testimonials });
});

// Submits a new user testimonial with bot protection and input validation.
app.post("/api/testimonials", async (c) => {
  if (isRateLimited(testimonialRateBuckets, getClientKey(c), TESTIMONIAL_RATE_LIMIT, TESTIMONIAL_RATE_WINDOW_MS)) {
    return c.json({ success: false, message: "Too many submissions. Please try again later." }, 429);
  }

  try {
    const body = await c.req.json();

    // Honeypot detection: bots auto-fill hidden input fields.
    if (body.website && String(body.website).trim().length > 0) {
      return c.json({ success: true, message: "Testimonial received." }, 201);
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const rating = typeof body.rating === "number" ? body.rating : 5;
    const dbType = typeof body.dbType === "string" && TESTIMONIAL_VALID_DB_TYPES.has(body.dbType)
      ? (body.dbType as ITestimonial["dbType"])
      : "general";

    if (!name || name.length < 2 || name.length > 50) {
      return c.json({ success: false, message: "Name must be between 2 and 50 characters." }, 400);
    }

    if (!role || role.length < 2 || role.length > 60) {
      return c.json({ success: false, message: "Role must be between 2 and 60 characters." }, 400);
    }

    if (!content || content.length < 10 || content.length > 500) {
      return c.json({ success: false, message: "Review content must be between 10 and 500 characters." }, 400);
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return c.json({ success: false, message: "Rating must be a whole number between 1 and 5." }, 400);
    }

    const created = await addTestimonial({
      name,
      role,
      content,
      rating,
      dbType,
    });

    return c.json({ success: true, testimonial: created }, 201);
  } catch (error) {
    console.error("Failed to process testimonial submission:", error);
    if (error instanceof Error && error.message === "Testimonial storage is currently unavailable.") {
      return c.json({ success: false, message: error.message }, 503);
    }
    return c.json({ success: false, message: "Invalid request payload." }, 400);
  }
});

app.post("/api/migrate/verify", async (c) => {
  const body = await c.req.json();
  const { uri, dbType = "mongodb", credent, firebaseType = "rtdb" } = body;

  const isFirestore = dbType === "firebase" && firebaseType === "firestore";
  if (!isFirestore && !uri) {
    return c.json({ success: false, message: "Missing URI" }, 400);
  }

  if (dbType === "firebase" && !credent) {
    return c.json({ success: false, message: "Missing Firebase credentials" }, 400);
  }

  // Validate URI format based on dbType
  const uriPatterns: Record<DatabaseType, RegExp> = {
    mongodb: /^mongodb(\+srv)?:\/\//,
    postgres: /^postgres(ql)?:\/\//,
    mysql: /^mysql:\/\//,
    redis: /^rediss?:\/\//,
    firebase: /^https:\/\/([a-z0-9-]+)(-default-rtdb)?\.(firebaseio\.com|firebasedatabase\.app)(\/.*)?$/i,
  };

  const pattern = uriPatterns[dbType as DatabaseType];
  if (!isFirestore && (!pattern || !pattern.test(uri))) {
    return c.json({ success: false, message: `Invalid ${dbType} URI` }, 400);
  }

  try {
    const adapter = getDatabaseAdapter(dbType as DatabaseType);
    const isValid = await adapter.verifyConnection(uri, credent, firebaseType);
    return c.json({
      success: isValid,
      message: isValid ? "Connection successful" : "Connection failed",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Verification failed",
        errorCode: classifyTelemetryError(error)
      },
      500,
    );
  }
});

app.post("/api/browser/schema", async (c) => {
  const startedAt = new Date();
  let databaseType: string | undefined;
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    if (typeof body.dbType === "string") databaseType = body.dbType;
    const { objects, truncated } = await listBrowserObjects(body);
    const identity = getTelemetryIdentity(c);

    trackEvent({
      distinctId: identity.visitorId || identity.sessionId || randomUUID(),
      event: "browser_schema_loaded",
      deployment: identity.deployment,
      properties: {
        databaseType,
        objectsProcessed: objects.length,
        truncated: Boolean(truncated),
        durationMs: Date.now() - startedAt.getTime(),
      },
    });

    return c.json({ objects, truncated });
  } catch (error) {
    const identity = getTelemetryIdentity(c);
    trackEvent({
      distinctId: identity.visitorId || identity.sessionId || randomUUID(),
      event: "browser_schema_failed",
      deployment: identity.deployment,
      properties: {
        databaseType,
        durationMs: Date.now() - startedAt.getTime(),
        // Never the raw message — driver errors embed hosts, users and connection strings.
        errorCode: classifyTelemetryError(error),
      },
    });

    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof BrowserServiceError) {
      return c.json({ error: message }, error.status);
    }

    console.error("Browser schema error:", error);
    return c.json({ error: "Failed to load database schema" }, 500);
  }
});

app.post("/api/browser/preview", async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    const preview = await previewBrowserObject(body);
    return c.json(preview);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof BrowserServiceError) {
      return c.json({ error: message }, error.status);
    }

    console.error("Browser preview error:", error);
    return c.json({ error: "Failed to preview database object" }, 500);
  }
});

app.post("/api/migrate/start", async (c) => {
  const body = await c.req.json();
  const { type, sourceUri, targetUri, firebaseType, sourceCredent, targetCredent, dbType = "mongodb", retryOf } = body;
  const selectedObjects = Array.isArray(body.selectedObjects)
    ? (body.selectedObjects.filter((item: unknown) => typeof item === "string" && item.trim().length > 0) as string[])
    : undefined;

  if (type === "copy") {
    const isFirestore = dbType === "firebase" && firebaseType === "firestore";
    if (!isFirestore && (!sourceUri || !targetUri)) {
      return c.json({ error: "Missing URIs" }, 400);
    }

    const job = createJob("copy", dbType as string, {
      ...getTelemetryIdentity(c),
      retryCount: typeof retryOf === "string" && retryOf ? 1 : 0,
      selectedObjects,
    });
    const adapter = getDatabaseAdapter(dbType as DatabaseType);

    const startCopyJob = async () => {
      try {
        await adapter.runCopyMigration(
          job.id,
          sourceUri,
          targetUri,
          sourceCredent,
          targetCredent,
          firebaseType,
          selectedObjects,
        );
      } catch (error) {
        const errorMessage = getSafeOperationError(error);
        console.error("Background migration failed:", errorMessage);
        addLog(job.id, `Migration failed: ${errorMessage}`);
        updateJob(job.id, { status: "failed", error: errorMessage });
      }
    };

    void startCopyJob();
    return c.json({ jobId: job.id, message: "Migration started" });
  }

  return c.json({ error: "Invalid migration type" }, 400);
});

app.get("/api/migrate/:jobId/status", async (c) => {
  const jobId = c.req.param("jobId");
  const job = getJob(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  const serializeJob = (j: Job) =>
    JSON.stringify({
      status: j.status,
      progress: j.progress,
      logs: j.logs,
      stats: j.stats,
      dbType: j.dbType,
      type: j.type,
      selectedObjects: j.selectedObjects,
      downloadUrl: j.downloadUrl,
      downloadExpiry: j.downloadExpiry,
      fileSizeBytes: j.fileSizeBytes,
      error: j.error,
    });

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: serializeJob(job),
    });

    const onUpdate = (updatedJob: Job) => {
      stream.writeSSE({
        data: serializeJob(updatedJob),
      });
    };

    job.emitter.on("update", onUpdate);

    stream.onAbort(() => {
      job.emitter.off("update", onUpdate);
    });

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (job.status === "completed" || job.status === "failed") {
        await stream.writeSSE({
          data: serializeJob(job),
        });
        break;
      }
    }
  });
});

app.post("/api/download", async (c) => {
  const body = await c.req.json();
  const { sourceUri, credent, type, dbType = "mongodb" } = body;
  const selectedObjects = Array.isArray(body.selectedObjects)
    ? (body.selectedObjects.filter((item: unknown) => typeof item === "string" && item.trim().length > 0) as string[])
    : undefined;

  const isFirestore = dbType === "firebase" && type === "firestore";
  if (!isFirestore && !sourceUri) return c.json({ error: "Missing Source URI" }, 400);

  const job = createJob("download", dbType as string, {
    ...getTelemetryIdentity(c),
    selectedObjects,
  });
  const fileName = `dump_${Date.now()}.zip`;
  const storageKey = `${job.id}_${fileName}`;

  const startDownloadJob = async () => {
    const { PassThrough } = await import("stream");
    const passThrough = new PassThrough();
    let uploadPromise: ReturnType<typeof uploadStreamToStorage> | undefined;
    updateJob(job.id, { status: "running", progress: 5 });
    addLog(job.id, "Starting database export archive...");

    try {
      uploadPromise = uploadStreamToStorage(
        storageKey,
        passThrough,
        fileName,
        (bytes) => {
          job.outputBytes = bytes;
        },
      );
      // Attach a handler immediately so an adapter failure cannot leave a rejected upload unobserved.
      void uploadPromise.catch(() => undefined);

      const adapter = getDatabaseAdapter(dbType as DatabaseType);
      await adapter.runDownload(job.id, sourceUri, passThrough, credent, type, selectedObjects);

      const result = await uploadPromise;
      addLog(job.id, "Export completed and uploaded to storage.");
      updateJob(job.id, {
        status: "completed",
        progress: 100,
        downloadUrl: result.downloadUrl,
        downloadKey: result.key,
        downloadExpiry: result.expiresAt,
        fileSizeBytes: result.sizeBytes,
      });
    } catch (e) {
      const errorMessage = getSafeOperationError(e);
      console.error("Background download failed:", errorMessage);
      addLog(job.id, `Export failed: ${errorMessage}`);
      updateJob(job.id, {
        status: "failed",
        error: errorMessage,
      });
      if (!passThrough.destroyed) {
        passThrough.destroy(e instanceof Error ? e : new Error(String(e)));
      }
      if (uploadPromise) {
        await uploadPromise.catch(() => undefined);
      }
    }
  };

  void startDownloadJob();

  return c.json(
    {
      jobId: job.id,
      message: "Download job started",
      status: "pending",
    },
    202,
  );
});

app.get("/api/download/file/:key", async (c) => {
  const key = c.req.param("key");
  const filePath = getLocalFilePath(key);
  if (!existsSync(filePath)) {
    return c.text("Download expired or not found", 404);
  }

  const fileName = key.includes("_") ? key.split("_").slice(1).join("_") : key;
  c.header("Content-Type", "application/zip");
  c.header("Content-Disposition", `attachment; filename="${fileName}"`);

  const fileStream = createReadStream(filePath);
  const webStream = Readable.toWeb(fileStream) as unknown as ReadableStream;
  return stream(c, async (honoStream) => {
    await honoStream.pipe(webStream);
  });
});

// Serve Static Files (Frontend) in Production
app.use(
  "/*",
  serveStatic({
    root: "./public",
    // Prerendered pages are written as <route>/index.html, so extensionless paths resolve to the
    // static file when one exists and fall through to the SPA handler below when it does not.
    rewriteRequestPath: (path) => {
      if (path === "/") return "/index.html";
      const lastSegment = path.split("/").pop() ?? "";
      if (lastSegment.includes(".")) return path;
      return `${path.replace(/\/$/, "")}/index.html`;
    },
  }),
);

/**
 * Every unmatched path used to return the app shell with a 200, which search engines report as a
 * soft 404 and which wastes crawl budget. The build emits route-manifest.json listing the paths the
 * SPA genuinely handles; anything outside it now gets a real 404.
 */
const buildRoutePatterns = (): RegExp[] => {
  try {
    const raw = readFileSync("./public/route-manifest.json", "utf8");
    const parsed = JSON.parse(raw) as { routes?: string[] };
    return (parsed.routes ?? []).map(
      (pattern) => new RegExp(`^${pattern.replace(/:[^/]+/g, "[^/]+")}/?$`),
    );
  } catch {
    // No manifest (dev, or a build predating it): fall back to treating every path as known.
    return [];
  }
};

const routePatterns = buildRoutePatterns();

const isKnownRoute = (path: string): boolean =>
  routePatterns.length === 0 || routePatterns.some((pattern) => pattern.test(path));

const pageCache = new Map<string, string | undefined>();

const readPublicPage = (fileName: string): string | undefined => {
  if (!pageCache.has(fileName)) {
    try {
      pageCache.set(fileName, readFileSync(`./public/${fileName}`, "utf8"));
    } catch {
      pageCache.set(fileName, undefined);
    }
  }
  return pageCache.get(fileName);
};

const firstAvailablePage = (...fileNames: string[]): string | undefined => {
  for (const fileName of fileNames) {
    const page = readPublicPage(fileName);
    if (page) return page;
  }
  return undefined;
};

// SPA fallback for known routes, real 404s for everything else.
app.all("*", (c) => {
  const path = c.req.path;

  if (path.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }

  if (isKnownRoute(path)) {
    const shell = firstAvailablePage("app-shell.html", "index.html");
    if (shell) return c.html(shell);
  }

  const notFoundPage = firstAvailablePage(
    "404.html",
    "app-shell.html",
    "index.html",
  );
  return notFoundPage ? c.html(notFoundPage, 404) : c.text("Not Found", 404);
});

const port = config.port;
let server: ReturnType<typeof serve> | undefined;

const startServer = () => {
  server = serve({ fetch: app.fetch, port });
  console.log(`Server is running on port ${port}`);
};

let shuttingDown = false;

/** PostHog batches events; without an explicit flush every deploy drops the pending queue. */
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));

  try {
    if (posthog) {
      await Promise.race([
        posthog.shutdown(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    }
  } catch (error) {
    console.error("Telemetry flush failed:", error instanceof Error ? error.message : error);
  }

  process.exit(0);
};

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

try {
  void cleanupExpiredLocalExports().catch((error) => {
    console.warn(
      "Failed to clean expired local exports:",
      error instanceof Error ? error.message : String(error),
    );
  });
  startServer();
} catch (error) {
  console.error("Server startup failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
