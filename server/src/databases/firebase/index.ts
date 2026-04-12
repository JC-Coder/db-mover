import { IDatabaseAdapter } from "../types";
import { Writable } from "stream";
import archiver from "archiver";
import { verifyConnection } from "./connection";
import { runDownload as runFirebaseDownload } from "./download";
import { runCopyMigration } from "./migration";
import { ServiceAccount } from "firebase-admin";

export class FirebaseAdapter implements IDatabaseAdapter {
  async verifyConnection(uri: string, credential: ServiceAccount): Promise<boolean> {
    if (!credential) {
      throw new Error("credentials are needed");
    }
    return verifyConnection(uri, credential);
  }

  async runCopyMigration(
    jobId: string,
    sourceUri: string,
    targetUri: string,
    sourceCredential?: ServiceAccount,
    targetCredential?: ServiceAccount,
    type = "rtdb",
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
    );
  }

  async runDownload(
    jobId: string,
    sourceUri: string,
    stream: Writable,
    credential?: ServiceAccount,
    type = "rtdb",
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

    // Pipe archive to the provided stream
    archive.pipe(stream);

    try {
      if (!credential) {
        throw new Error("credentials are needed");
      }

      // Run the download logic
      await runFirebaseDownload(sourceUri, credential, type, archive);
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
