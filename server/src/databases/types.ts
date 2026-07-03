import { ServiceAccount } from "firebase-admin";
import { Writable } from "stream";

export type DatabaseType = "mongodb" | "postgres" | "mysql" | "redis" | "firebase";
export type BrowserObjectType = "collection" | "table" | "keyspace" | "path";

export interface IBrowserConnection {
  sourceUri: string;
  credent?: ServiceAccount;
  type?: string;
}

export interface IBrowserObject {
  database: string;
  name: string;
  type: BrowserObjectType;
  schema?: string;
  count?: number;
}

export interface IBrowserPreviewRequest {
  database?: string;
  schema?: string;
  objectName: string;
  limit: number;
  offset: number;
  cursor?: string;
}

export interface IBrowserPreview {
  rows: Record<string, unknown>[];
  columns: string[];
  limit: number;
  offset: number;
  elapsedMs: number;
  total?: number;
  nextCursor?: string;
}


export interface IDatabaseAdapter {
  verifyConnection(uri: string, credent?: ServiceAccount, type?: string): Promise<boolean>;
  listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObject[]>;
  previewBrowserObject(
    connection: IBrowserConnection,
    request: IBrowserPreviewRequest,
  ): Promise<IBrowserPreview>;
  runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
  ): Promise<void>;
  runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
    sourceCredent?: ServiceAccount,
    targetCredent?: ServiceAccount,
    type?: string,
  ): Promise<void>;
  runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
  ): Promise<void>;
  runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
    credent?: ServiceAccount,
    type?: string,
  ): Promise<void>;
}
