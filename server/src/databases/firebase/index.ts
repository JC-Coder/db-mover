import { IDatabaseAdapter } from "../types";
import { Writable } from "stream";
import archiver from "archiver";
import { verifyConnection } from "./connection";
import { runDownload as runFirebaseDownload } from "./download";
import { runCopyMigration } from "./migration";
import { ServiceAccount } from "firebase-admin";


export class FirebaseAdapter implements IDatabaseAdapter {
    async verifyConnection(uri: string, credent: ServiceAccount): Promise<boolean> {
        if (!credent) throw new Error("credentials are needed");
        return verifyConnection(uri, credent);
    }

    async runCopyMigration(
        jobId: string,
        sourceUri: string,
        targetUri: string,
        sourceCredent?: ServiceAccount,
        targetCredent?: ServiceAccount,
        type?: string,

    ): Promise<void> {
        if (!sourceCredent || !targetCredent) throw new Error("credentials are needed");
        if (!type) type = "rtdb";

        return runCopyMigration(jobId, sourceUri, targetUri, sourceCredent, targetCredent, type);
    }

    async runDownload(
        jobId: string,
        sourceUri: string,
        stream: Writable,
        credent?: ServiceAccount,
        type?: string,): Promise<void> {


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
            if (!credent) throw new Error("credentials are needed");
            if (!type) type = "rtdb";
            // Run the download logic
            await runFirebaseDownload(sourceUri, credent, type, archive);
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

export const firebaseAdapter = new FirebaseAdapter();
