import { IDatabaseAdapter } from "../types";
import { verifyConnection } from "./connection";
import { runCopyMigration } from "./migration";
import { runDownload as runMongoDownload } from "./download";
import {
  listBrowserObjects as listMongoBrowserObjects,
  previewBrowserObject as previewMongoBrowserObject,
} from "./browser";
import { Writable } from "stream";
import archiver from "archiver";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

export class MongoAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string): Promise<boolean> {
    return verifyConnection(uri);
  }

  async listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObject[]> {
    return listMongoBrowserObjects(connection);
  }

  async previewBrowserObject(
    connection: IBrowserConnection,
    request: IBrowserPreviewRequest,
  ): Promise<IBrowserPreview> {
    return previewMongoBrowserObject(connection, request);
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
    // For MongoDB, we need to use archiver, so we create a wrapper
    // The stream parameter is actually the response stream from Hono
    // We'll create an archiver and pipe it to the stream
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

    // Pipe archive to the provided stream
    archive.pipe(stream);

    try {
      // Run the download logic
      await runMongoDownload(sourceUri, archive);
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

export const mongoAdapter = new MongoAdapter();
