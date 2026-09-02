import { Writable } from "stream";
import { ServiceAccount } from "firebase-admin";
import { getDatabaseAdapter, DatabaseType } from "../databases";

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
  dbType: DatabaseType = "mongodb",
  sourceCredent?: ServiceAccount,
  targetCredent?: ServiceAccount,
  type?: string,
  selectedObjects?: string[]
) => {
  const adapter = getDatabaseAdapter(dbType);
  return adapter.runCopyMigration(
    jobId,
    sourceUri,
    targetUri,
    sourceCredent,
    targetCredent,
    type,
    selectedObjects
  );
};

export const runDownload = async (
  jobId: string,
  sourceUri: string,
  stream: Writable,
  dbType: DatabaseType = "mongodb",
  credent?: ServiceAccount,
  type?: string,
  selectedObjects?: string[]
) => {
  const adapter = getDatabaseAdapter(dbType);
  return adapter.runDownload(jobId, sourceUri, stream, credent, type, selectedObjects);
};
