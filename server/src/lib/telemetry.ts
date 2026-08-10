import { PostHog } from "posthog-node";

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

export const posthog = apiKey ? new PostHog(apiKey, { host }) : null;

export type TelemetryDeployment = "hosted" | "self_hosted";
export type TelemetryEnvironment = "production" | "development" | "test";

/** Domain that identifies the hosted deployment. Override for a differently-branded host. */
const HOSTED_DOMAIN = (process.env.DB_MOVER_HOSTED_DOMAIN || "dbmover.cloud").toLowerCase();

/**
 * Deployment is derived from the request host, because DB_MOVER_DEPLOYMENT is easy to forget
 * and NODE_ENV is useless here — self-hosters run production builds too. The env var, when set,
 * wins as an explicit operator override (e.g. a hosted instance behind a custom domain).
 */
export const resolveDeployment = (requestHost?: string): TelemetryDeployment => {
  // Evidence beats configuration: the central instance relays events for self-hosted installs
  // too, so DB_MOVER_DEPLOYMENT must never be able to relabel a request that identifies itself.
  const hostname = (requestHost || "").toLowerCase().split(":")[0].trim();
  if (hostname) {
    return hostname === HOSTED_DOMAIN || hostname.endsWith(`.${HOSTED_DOMAIN}`)
      ? "hosted"
      : "self_hosted";
  }

  const configured = process.env.DB_MOVER_DEPLOYMENT?.trim().toLowerCase();
  if (configured === "hosted" || configured === "self_hosted") return configured;
  return "self_hosted";
};

/**
 * The server decides the environment. A client may downgrade itself to development (a dev build
 * pointed at a production relay), but can never upgrade itself into the public production numbers.
 */
export const resolveEnvironment = (clientClaim?: unknown): TelemetryEnvironment => {
  if (clientClaim === "development" || clientClaim === "test") return clientClaim;
  return process.env.NODE_ENV === "production" ? "production" : "development";
};

export type TelemetryErrorCode =
  | "auth_failed"
  | "host_not_found"
  | "connection_refused"
  | "connection_timeout"
  | "tls_error"
  | "permission_denied"
  | "database_not_found"
  | "invalid_uri"
  | "network_unreachable"
  | "aborted"
  | "unsupported_operation"
  | "unknown_error";

const ERROR_PATTERNS: Array<{ code: TelemetryErrorCode; test: RegExp }> = [
  { code: "auth_failed", test: /auth|password|credential|wrongpass|noauth|access denied|login failed|sasl/ },
  { code: "host_not_found", test: /enotfound|getaddrinfo|eai_again|servernotfound|unknown host|no such host/ },
  { code: "connection_refused", test: /econnrefused|connection refused|econnreset|connection closed|socket hang up/ },
  { code: "connection_timeout", test: /etimedout|timed? ?out|timeout|serverselectionerror|esockettimedout/ },
  { code: "tls_error", test: /\btls\b|\bssl\b|certificate|self.signed|depth_zero|handshake/ },
  { code: "permission_denied", test: /permission|not authorized|unauthorized|forbidden|privilege|eacces/ },
  { code: "database_not_found", test: /does not exist|not found|unknown database|no such (table|collection|database|key)|undefined_table/ },
  { code: "invalid_uri", test: /invalid (uri|connection string|url|scheme)|malformed|must start with|parse error/ },
  { code: "network_unreachable", test: /enetunreach|ehostunreach|network is unreachable|no route to host/ },
  { code: "aborted", test: /abort|cancell?ed|closed before|client disconnect/ },
  { code: "unsupported_operation", test: /unsupported|not implemented|not supported/ },
];

/**
 * Reduce an error to a fixed code. Driver errors embed hostnames, ports, usernames and sometimes
 * whole connection strings, so the message text itself must never be sent anywhere.
 */
export const classifyTelemetryError = (error: unknown): TelemetryErrorCode => {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message} ${(error as NodeJS.ErrnoException).code ?? ""}`
      : typeof error === "string"
        ? error
        : "";
  const message = raw.toLowerCase();
  if (!message.trim()) return "unknown_error";

  const match = ERROR_PATTERNS.find((pattern) => pattern.test.test(message));
  return match ? match.code : "unknown_error";
};

const MAX_STRING_LENGTH = 200;
/** Nothing we legitimately report is a URI; anything shaped like one is a leak. */
const URI_SHAPED = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Last line of defence before anything leaves the process: drop URI-shaped values, truncate long
 * strings, and refuse nested objects that could smuggle unreviewed fields through.
 */
const sanitizeProperties = (properties: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      if (URI_SHAPED.test(value)) continue;
      safe[key] = value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
      continue;
    }
    if (typeof value === "number") {
      if (Number.isFinite(value)) safe[key] = value;
      continue;
    }
    if (typeof value === "boolean") safe[key] = value;
  }
  return safe;
};

export interface ITelemetryPayload {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  deployment?: TelemetryDeployment;
  environment?: TelemetryEnvironment;
}

/**
 * Where a server with no PostHog project of its own sends its events. Operation results
 * (records moved, durations, outcomes) are produced server-side and never pass through the
 * browser, so without this hop the public stats would only ever describe the hosted app.
 */
const CENTRAL_RELAY_URL =
  process.env.DB_MOVER_CENTRAL_TELEMETRY_URL?.trim() || "https://dbmover.cloud/api/telemetry/event";

/** Header marking a server-to-server forward, so the receiver can refuse to forward it onward. */
export const RELAY_HOP_HEADER = "x-db-mover-relay-hop";

/**
 * True when this process would be forwarding to itself: it is the hosted deployment and the
 * configured target is the hosted domain. Normally the PostHog key prevents forwarding at all,
 * but that key is exactly what goes missing in a bad deploy — which is when a self-directed
 * forward would loop.
 */
const isSelfDirectedForward = (): boolean => {
  if (resolveDeployment() !== "hosted") return false;
  try {
    const target = new URL(CENTRAL_RELAY_URL).hostname.toLowerCase();
    return target === HOSTED_DOMAIN || target.endsWith(`.${HOSTED_DOMAIN}`);
  } catch {
    return false;
  }
};

/**
 * Forward to the central relay. Only reached when this install has no POSTHOG_API_KEY — the
 * central instance normally has one, so it captures directly rather than forwarding.
 */
const forwardEvent = (payload: ITelemetryPayload): void => {
  if (isSelfDirectedForward()) {
    console.error(
      "Telemetry dropped: this instance is the hosted deployment but has no POSTHOG_API_KEY. " +
        "Forwarding to itself would loop.",
    );
    return;
  }

  void fetch(CENTRAL_RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", [RELAY_HOP_HEADER]: "1" },
    body: JSON.stringify({
      distinctId: payload.distinctId,
      event: payload.event,
      properties: sanitizeProperties(payload.properties || {}),
      // A forwarder may only ever declare itself self-hosted; the relay ignores any other claim.
      deployment: "self_hosted",
      environment: payload.environment || resolveEnvironment(),
      appVersion: process.env.DB_MOVER_VERSION,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // Telemetry is best-effort and must never affect the operation that produced it.
  });
};

export const trackEvent = (payload: ITelemetryPayload): void => {
  if (!posthog) {
    try {
      forwardEvent(payload);
    } catch (error) {
      console.error("Telemetry forward failed:", error instanceof Error ? error.message : error);
    }
    return;
  }
  try {
    posthog.capture({
      distinctId: payload.distinctId,
      event: payload.event,
      properties: {
        $lib: "db-mover-relay",
        $process_person_profile: false,
        deployment: payload.deployment || resolveDeployment(),
        environment: payload.environment || resolveEnvironment(),
        app_version: process.env.DB_MOVER_VERSION || "1.0.0",
        ...sanitizeProperties(payload.properties || {}),
      },
    });
  } catch (error) {
    // Telemetry must never be able to fail a migration.
    console.error("Telemetry capture failed:", error instanceof Error ? error.message : error);
  }
};
