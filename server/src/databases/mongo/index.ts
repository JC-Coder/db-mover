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
  IBrowserObjectList,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

export class MongoAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string): Promise<boolean> {
    return verifyConnection(uri);
  }

  async listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObjectList> {
    return { objects: await listMongoBrowserObjects(connection) };
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
    targetUri: string,
    _sourceCredent?: unknown,
    _targetCredent?: unknown,
    _type?: string,
    selectedObjects?: string[],
  ): Promise<void> {
    return runCopyMigration(jobId, sourceUri, targetUri, selectedObjects);
  }

  async runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
    _credent?: unknown,
    _type?: string,
    selectedObjects?: string[],
  ): Promise<void> {
    // For MongoDB, we need to use archiver, so we create a wrapper
    // The stream parameter is actually the response stream from Hono
    // We'll create an archiver and pipe it to the stream
    const archive = archiver("zip", {
      zlib: { level: 1 },
    });

    // Create a promise that resolves when the stream finishes
    const streamFinished = new Promise<void>((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Rejects when the sink errors, but it is only awaited on the success path: a
    // failure raised before that point would otherwise surface as an unhandled
    // rejection and take the process down.
    void streamFinished.catch(() => undefined);

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      stream.destroy(err);
    });

    // Pipe archive to the provided stream
    archive.pipe(stream);

    try {
      // Run the download logic
      await runMongoDownload(sourceUri, archive, selectedObjects);
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
