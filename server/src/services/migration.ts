import { Writable } from "stream";
import { getDatabaseAdapter, DatabaseType } from "../databases";

export const runCopyMigration = async (
  jobId: string,
  sourceUri: string,
  targetUri: string,
  dbType: DatabaseType = "mongodb"
) => {
  const adapter = getDatabaseAdapter(dbType);
  return adapter.runCopyMigration(jobId, sourceUri, targetUri);
};

export const runDownload = async (
  jobId: string,
  sourceUri: string,
  stream: Writable,
  dbType: DatabaseType = "mongodb"
) => {
  const adapter = getDatabaseAdapter(dbType);
  return adapter.runDownload(jobId, sourceUri, stream);
};
