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


export interface IBrowserObjectList {
  objects: IBrowserObject[];
  // Set when the source was too large to enumerate exhaustively, so the list is a
  // sample. Selective transfer treats this list as an allow-list, and a group missing
  // from it can never be chosen.
  truncated?: boolean;
}

export interface IDatabaseAdapter {
  verifyConnection(uri: string, credent?: ServiceAccount, type?: string): Promise<boolean>;
  listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObjectList>;
  previewBrowserObject(
    connection: IBrowserConnection,
    request: IBrowserPreviewRequest,
  ): Promise<IBrowserPreview>;
  runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
    sourceCredent?: ServiceAccount,
    targetCredent?: ServiceAccount,
    type?: string,
    selectedObjects?: string[],
  ): Promise<void>;
  runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
    credent?: ServiceAccount,
    type?: string,
    selectedObjects?: string[],
  ): Promise<void>;
}
