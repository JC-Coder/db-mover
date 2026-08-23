import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { classifyTelemetryError, trackEvent, TelemetryDeployment } from "./telemetry";

export interface IJobStats {
  collections?: number; // For MongoDB
  tables?: number; // For SQL databases
  keys?: number; // For Redis
  documents?: number; // Generic count (documents for MongoDB, rows for SQL)
  totalDocuments?: number;
}

export interface Job {
  id: string;
  type: "copy" | "download";
  dbType?: string;
  status: "pending" | "running" | "completed" | "failed";
  logs: string[];
  stats: IJobStats;
  progress: number;
  error?: string;
  startedAt: string;
  finishedAt?: string;
  visitorId?: string;
  sessionId?: string;
  deployment?: TelemetryDeployment;
  /** Stable id for telemetry: the visitor when known, else a UUID. Job ids are not valid ids. */
  telemetryId: string;
  retryCount: number;
  outputBytes: number;
  downloadUrl?: string;
  downloadKey?: string;
  downloadExpiry?: string;
  fileSizeBytes?: number;
  telemetryRecorded: boolean;
  emitter: EventEmitter;
}

export interface IJobTelemetryContext {
  visitorId?: string;
  sessionId?: string;
  deployment?: TelemetryDeployment;
  retryCount?: number;
}

const jobs = new Map<string, Job>();

export const createJob = (
  type: "copy" | "download",
  dbType: string,
  context: IJobTelemetryContext = {},
): Job => {
  const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startedAt = new Date().toISOString();
  const job: Job = {
    id,
    type,
    dbType,
    status: "pending",
    logs: [],
    stats: { collections: 0, documents: 0, tables: 0, keys: 0 },
    progress: 0,
    startedAt,
    visitorId: context.visitorId,
    sessionId: context.sessionId,
    deployment: context.deployment,
    telemetryId: context.visitorId || randomUUID(),
    retryCount: context.retryCount ?? 0,
    outputBytes: 0,
    telemetryRecorded: false,
    emitter: new EventEmitter(),
  };
  jobs.set(id, job);

  trackEvent({
    distinctId: job.telemetryId,
    event: "operation_started",
    deployment: context.deployment,
    properties: {
      operationId: id,
      sessionId: context.sessionId,
      mode: type,
      databaseType: dbType,
      retryCount: context.retryCount ?? 0,
    },
  });

  return job;
};

export const getJob = (id: string) => jobs.get(id);

export const updateJob = (id: string, updates: Partial<Job>) => {
  const job = jobs.get(id);
  if (!job) return;

  Object.assign(job, updates);

  if (
    !job.telemetryRecorded &&
    (updates.status === "completed" || updates.status === "failed")
  ) {
    job.telemetryRecorded = true;
    job.finishedAt = new Date().toISOString();
    const objectCount = job.stats.collections ?? job.stats.tables ?? job.stats.keys ?? 0;
    const durationMs = Date.parse(job.finishedAt) - Date.parse(job.startedAt);

    trackEvent({
      distinctId: job.telemetryId,
      event: updates.status === "completed" ? "operation_completed" : "operation_failed",
      deployment: job.deployment,
      properties: {
        operationId: job.id,
        sessionId: job.sessionId,
        mode: job.type,
        databaseType: job.dbType,
        status: updates.status,
        startedAt: job.startedAt,
        completedAt: job.finishedAt,
        durationMs,
        recordsProcessed: job.stats.documents ?? 0,
        objectsProcessed: objectCount,
        outputBytes: job.outputBytes,
        retryCount: job.retryCount,
        // Never the raw message — driver errors embed hosts, users and connection strings.
        errorCode: job.error ? classifyTelemetryError(job.error) : undefined,
      },
    });
  }

  if (updates.logs) {
    // Emit log event if logs were updated
  }

  job.emitter.emit("update", job);
};

export const addLog = (id: string, message: string) => {
  const job = jobs.get(id);
  if (!job) return;
  job.logs.push(message);
  job.emitter.emit("log", message);
  job.emitter.emit("update", job);
};

// Cleanup old jobs periodically
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    // 1 hour retention
    if (
      ["completed", "failed"].includes(job.status) &&
      parseInt(id.split("_")[1]) < now - 3600000
    ) {
      jobs.delete(id);
    }
  }
}, 60000);
cleanupTimer.unref();
