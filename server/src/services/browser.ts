import {
  DatabaseType,
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../databases/types";
import { getDatabaseAdapter } from "../databases";
import { ServiceAccount } from "firebase-admin";

const DATABASE_TYPES: DatabaseType[] = ["mongodb", "postgres", "mysql", "redis", "firebase"];
const MAX_PREVIEW_LIMIT = 100;
const DEFAULT_PREVIEW_LIMIT = 50;

export class BrowserServiceError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 500 = 400,
  ) {
    super(message);
  }
}

const isDatabaseType = (value: unknown): value is DatabaseType => {
  return typeof value === "string" && DATABASE_TYPES.includes(value as DatabaseType);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getString = (body: Record<string, unknown>, key: string): string | undefined => {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getNumber = (body: Record<string, unknown>, key: string): number | undefined => {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
};

const validateUri = (dbType: DatabaseType, sourceUri: string, firebaseType?: string) => {
  if (dbType === "firebase" && firebaseType === "firestore") return;

  const patterns: Record<DatabaseType, RegExp> = {
    mongodb: /^mongodb(\+srv)?:\/\//,
    postgres: /^postgres(ql)?:\/\//,
    mysql: /^mysql:\/\//,
    redis: /^rediss?:\/\//,
    firebase: /^https:\/\/([a-z0-9-]+)(-default-rtdb)?\.(firebaseio\.com|firebasedatabase\.app)(\/.*)?$/i,
  };

  if (!patterns[dbType].test(sourceUri)) {
    throw new BrowserServiceError(`Invalid ${dbType} connection string`);
  }
};

const parseConnection = (body: Record<string, unknown>) => {
  const dbType = body.dbType;
  if (!isDatabaseType(dbType)) {
    throw new BrowserServiceError("Unsupported database type");
  }

  const sourceUri = getString(body, "sourceUri") ?? "";
  const type = getString(body, "type");
  const credent = body.credent;

  if (dbType === "firebase") {
    if (!isRecord(credent)) {
      throw new BrowserServiceError("Firebase credentials are required");
    }

    if (type !== "firestore" && !sourceUri) {
      throw new BrowserServiceError("Firebase Realtime Database URL is required");
    }
  } else if (!sourceUri) {
    throw new BrowserServiceError("Source URI is required");
  }

  validateUri(dbType, sourceUri, type);

  return {
    dbType,
    connection: {
      sourceUri,
      credent: credent as ServiceAccount | undefined,
      type,
    } satisfies IBrowserConnection,
  };
};

const parsePreviewRequest = (body: Record<string, unknown>): IBrowserPreviewRequest => {
  const objectName = getString(body, "objectName");
  if (!objectName) {
    throw new BrowserServiceError("Object name is required");
  }

  const requestedLimit = getNumber(body, "limit") ?? DEFAULT_PREVIEW_LIMIT;
  const requestedOffset = getNumber(body, "offset") ?? 0;

  return {
    database: getString(body, "database"),
    schema: getString(body, "schema"),
    objectName,
    limit: Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PREVIEW_LIMIT),
    offset: Math.max(Math.trunc(requestedOffset), 0),
    cursor: getString(body, "cursor"),
  };
};

// Lists database objects without running user-authored queries.
export const listBrowserObjects = async (body: Record<string, unknown>): Promise<IBrowserObject[]> => {
  const { dbType, connection } = parseConnection(body);
  const adapter = getDatabaseAdapter(dbType);
  return adapter.listBrowserObjects(connection);
};

// Previews a bounded page from a selected object while keeping execution read-only.
export const previewBrowserObject = async (body: Record<string, unknown>): Promise<IBrowserPreview> => {
  const { dbType, connection } = parseConnection(body);
  const request = parsePreviewRequest(body);
  const adapter = getDatabaseAdapter(dbType);
  return adapter.previewBrowserObject(connection, request);
};
