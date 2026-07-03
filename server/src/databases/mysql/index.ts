import { IDatabaseAdapter } from "../types";
import { verifyConnection } from "./connection";
import { runCopyMigration } from "./migration";
import { runDownload as runMysqlDownload } from "./download";
import {
  listBrowserObjects as listMysqlBrowserObjects,
  previewBrowserObject as previewMysqlBrowserObject,
} from "./browser";
import { Writable } from "stream";
import archiver from "archiver";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

export class MysqlAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string): Promise<boolean> {
    return verifyConnection(uri);
  }

  async listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObject[]> {
    return listMysqlBrowserObjects(connection);
  }

  async previewBrowserObject(
    connection: IBrowserConnection,
    request: IBrowserPreviewRequest,
  ): Promise<IBrowserPreview> {
    return previewMysqlBrowserObject(connection, request);
  }

  async runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string
  ): Promise<void> {
    return runCopyMigration(jobId, sourceUri, targetUri);
  }

  async runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable
  ): Promise<void> {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    // Create a promise that resolves when the stream finishes
    const streamFinished = new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      stream.destroy(err);
    });

    archive.pipe(stream);

    try {
      await runMysqlDownload(sourceUri, archive);
      // Wait for the stream to finish writing
      await streamFinished;
    } catch (error) {
      // If download fails, destroy archive which will trigger error handler
      archive.destroy(
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}

export const mysqlAdapter = new MysqlAdapter();
