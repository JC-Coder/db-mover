import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stream, streamSSE } from "hono/streaming";
import { createJob, getJob, Job, addLog, updateJob } from "./lib/jobManager";
import { runCopyMigration, runDownload } from "./services/migration";
import { getDatabaseAdapter, DatabaseType } from "./databases";
import archiver from "archiver";

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
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  }),
);

// API Routes
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/stats", (c) => {
  return c.json({
    stars: 124,
    forks: 18,
    contributors: 5,
  });
});

app.post("/api/migrate/verify", async (c) => {
  const body = await c.req.json();
  const { uri, dbType = "mongodb" } = body;

  if (!uri) {
    return c.json({ success: false, message: "Missing URI" }, 400);
  }

  // Validate URI format based on dbType
  const uriPatterns: Record<DatabaseType, RegExp> = {
    mongodb: /^mongodb(\+srv)?:\/\//,
    postgres: /^postgres(ql)?:\/\//,
    mysql: /^mysql:\/\//,
    redis: /^rediss?:\/\//,
    firebase: /^firebase?:\/\//,
  };

  const pattern = uriPatterns[dbType as DatabaseType];
  if (!pattern || !pattern.test(uri)) {
    return c.json({ success: false, message: `Invalid ${dbType} URI` }, 400);
  }

  try {
    const adapter = getDatabaseAdapter(dbType as DatabaseType);
    const isValid = await adapter.verifyConnection(uri);
    return c.json({
      success: isValid,
      message: isValid ? "Connection successful" : "Connection failed",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { success: false, message: `Verification failed: ${errorMessage}` },
      500,
    );
  }
});

app.post("/api/migrate/start", async (c) => {
  const body = await c.req.json();
  const { type, sourceUri, targetUri, firebaseType, sourceCredent, targetCredent, dbType = "mongodb" } = body;

  if (type === "copy") {
    const isFirestore = dbType === "firebase" && firebaseType === "firestore";
    if (!isFirestore && (!sourceUri || !targetUri)) {
      return c.json({ error: "Missing URIs" }, 400);
    }

    const job = createJob("copy", dbType as string);
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
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Background migration failed:", error);
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

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        status: job.status,
        progress: job.progress,
        logs: job.logs,
        stats: job.stats,
        dbType: job.dbType,
      }),
    });

    const onUpdate = (updatedJob: Job) => {
      stream.writeSSE({
        data: JSON.stringify({
          status: updatedJob.status,
          progress: updatedJob.progress,
          logs: updatedJob.logs,
          stats: updatedJob.stats,
          dbType: updatedJob.dbType,
        }),
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
          data: JSON.stringify({
            status: job.status,
            progress: job.progress,
            logs: job.logs,
            stats: job.stats,
          }),
        });
        break;
      }
    }
  });
});

app.post("/api/download", async (c) => {
  const body = await c.req.json();
  const { sourceUri, credent, type, dbType = "mongodb" } = body;

  const isFirestore = dbType === "firebase" && type === "firestore";
  if (!isFirestore && !sourceUri) return c.json({ error: "Missing Source URI" }, 400);

  c.header("Content-Type", "application/zip");
  c.header(
    "Content-Disposition",
    `attachment; filename="dump_${Date.now()}.zip"`,
  );

  return stream(c, async (honoStream) => {
    // Create a Node.js Writable stream that writes to Hono stream
    const { Writable } = await import("stream");
    const writableStream = new Writable({
      write(chunk: Buffer, encoding: string, callback: () => void) {
        honoStream
          .write(chunk)
          .then(() => callback())
          .catch(callback);
      },
    });

    // Handle stream errors
    writableStream.on("error", (err) => {
      console.error("Stream error:", err);
    });

    try {
      const job = createJob("download", dbType as string);
      const adapter = getDatabaseAdapter(dbType as DatabaseType);
      await adapter.runDownload(job.id, sourceUri, writableStream, credent, type);
    } catch (e) {
      console.error("Download error:", e);
      // Destroy stream gracefully
      if (!writableStream.destroyed) {
        writableStream.destroy(e instanceof Error ? e : new Error(String(e)));
      }
    }
  });
});

// Serve Static Files (Frontend) in Production
// We expect client dist to be copied to ./public or similar in Docker
// Or we can serve from relative path
app.use(
  "/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => (path === "/" ? "/index.html" : path),
  }),
);

// Fallback for SPA routing
app.use(
  "*",
  serveStatic({
    path: "./public/index.html",
  }),
);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
