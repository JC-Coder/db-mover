import { Writable } from "stream";

export type DatabaseType = "mongodb" | "postgres" | "mysql" | "redis" | "firebase";


export interface IDatabaseAdapter {
  verifyConnection(uri: string, credent?: string, type?: string): Promise<boolean>;
  runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string
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
    credent?: string,
    type?: string,
  ): Promise<void>;
}
