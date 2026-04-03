import { ServiceAccount } from "firebase-admin";
import { Writable } from "stream";

export type DatabaseType = "mongodb" | "postgres" | "mysql" | "redis" | "firebase";


export interface IDatabaseAdapter {
  verifyConnection(uri: string, credent?: ServiceAccount, type?: string): Promise<boolean>;
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
