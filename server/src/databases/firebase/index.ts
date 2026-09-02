import { IDatabaseAdapter } from "../types";
import { Writable } from "stream";
import archiver from "archiver";
import { verifyConnection } from "./connection";
import { runDownload as runFirebaseDownload } from "./download";
import { runCopyMigration } from "./migration";
import {
  listBrowserObjects as listFirebaseBrowserObjects,
  previewBrowserObject as previewFirebaseBrowserObject,
} from "./browser";
import { ServiceAccount } from "firebase-admin";
import {
  IBrowserConnection,
  IBrowserObject,
  IBrowserObjectList,
  IBrowserPreview,
  IBrowserPreviewRequest,
} from "../types";

export class FirebaseAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string, credential?: ServiceAccount, type = "rtdb"): Promise<boolean> {
    if (!credential) {
      throw new Error("credentials are needed");
    }
    return verifyConnection(uri, credential, type);
  }

  async listBrowserObjects(connection: IBrowserConnection): Promise<IBrowserObjectList> {
    return { objects: await listFirebaseBrowserObjects(connection) };
  }

  async previewBrowserObject(
    connection: IBrowserConnection,
    request: IBrowserPreviewRequest,
  ): Promise<IBrowserPreview> {
    return previewFirebaseBrowserObject(connection, request);
  }

  async runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
    sourceCredential?: ServiceAccount,
    targetCredential?: ServiceAccount,
    type = "rtdb",
    selectedObjects?: string[],
  ): Promise<void> {
    if (!sourceCredential || !targetCredential) {
      throw new Error("credentials are needed");
    }

    return runCopyMigration(
      jobId,
      sourceUri,
      targetUri,
      sourceCredential,
      targetCredential,
      type,
      selectedObjects,
    );
  }

  async runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
    credential?: ServiceAccount,
    type = "rtdb",
    selectedObjects?: string[],
  ): Promise<void> {
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
      if (!credential) {
        throw new Error("credentials are needed");
      }

      // Run the download logic
      await runFirebaseDownload(sourceUri, credential, type, archive, selectedObjects);
      // Wait for the stream to finish writing
      await streamFinished;
    } catch (error) {
      // If download fails, destroy archive which will trigger error handler
      archive.destroy(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }
}

export const firebaseAdapter = new FirebaseAdapter();
