import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import { mkdir, readdir, stat, unlink } from "fs/promises";
import { config } from "./config";

export interface IStorageUploadResult {
  key: string;
  sizeBytes: number;
  downloadUrl: string;
  expiresAt: string;
}

const getR2Config = () => {
  return {
    accountId: config.storage.accountId,
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
    bucketName: config.storage.bucketName,
    expiresSeconds: config.storage.presignedExpiresSeconds,
  };
};

const getExpiryMilliseconds = (): number => {
  const { expiresSeconds } = getR2Config();
  return Number.isFinite(expiresSeconds) && expiresSeconds > 0
    ? expiresSeconds * 1000
    : 2 * 60 * 60 * 1000;
};

const getLocalStorageDir = () => {
  return path.resolve(
    config.storage.downloadDirectory,
  );
};

let s3ClientInstance: S3Client | null = null;

export const isR2Configured = (): boolean => {
  const cfg = getR2Config();
  return Boolean(
    cfg.accountId &&
      cfg.accessKeyId &&
      cfg.secretAccessKey &&
      cfg.bucketName,
  );
};

const getS3Client = (): S3Client => {
  const cfg = getR2Config();
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 credentials are not configured in environment.");
  }
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId!,
        secretAccessKey: cfg.secretAccessKey!,
      },
    });
  }
  return s3ClientInstance;
};

export const ensureLocalStorageDir = async (): Promise<void> => {
  const dir = getLocalStorageDir();
  if (!fs.existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
};

// Removes files left behind when the process restarts before their upload timer fires.
export const cleanupExpiredLocalExports = async (): Promise<void> => {
  const dir = getLocalStorageDir();
  if (!fs.existsSync(dir)) return;

  const expiryTime = Date.now() - getExpiryMilliseconds();
  const entries = await readdir(dir);

  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(dir, entry);
      const fileStats = await stat(filePath);
      if (fileStats.isFile() && fileStats.mtimeMs < expiryTime) {
        await unlink(filePath);
      }
    }),
  );
};

export const getLocalFilePath = (key: string): string => {
  const safeKey = path.basename(key);
  return path.join(getLocalStorageDir(), safeKey);
};

/**
 * Streams data directly into Cloudflare R2 (or local storage fallback) with constant O(1) memory.
 */
export const uploadStreamToStorage = async (
  key: string,
  stream: Readable,
  fileName: string = `dump_${Date.now()}.zip`,
  onProgress?: (bytes: number) => void,
): Promise<IStorageUploadResult> => {
  const cfg = getR2Config();
  const expiryMilliseconds = getExpiryMilliseconds();
  const expiresAt = new Date(Date.now() + expiryMilliseconds).toISOString();

  if (isR2Configured()) {
    console.log(`[Storage] Uploading archive "${fileName}" to Cloudflare R2 (Bucket: ${cfg.bucketName}, Key: ${key})`);
    const s3 = getS3Client();
    let uploadedBytes = 0;

    stream.on("data", (chunk: Buffer) => {
      uploadedBytes += chunk.length;
      if (onProgress) onProgress(uploadedBytes);
    });

    const parallelUpload = new Upload({
      client: s3,
      params: {
        Bucket: cfg.bucketName!,
        Key: key,
        Body: stream,
        ContentType: "application/zip",
        ContentDisposition: `attachment; filename="${fileName}"`,
      },
      queueSize: 4,
      partSize: 10 * 1024 * 1024, // 10 MB chunk size
      leavePartsOnError: false,
    });

    await parallelUpload.done();

    const downloadUrl = await getDownloadUrl(key, fileName);
    console.log(`[Storage] Upload complete to Cloudflare R2 (${uploadedBytes} bytes).`);
    return {
      key,
      sizeBytes: uploadedBytes,
      downloadUrl,
      expiresAt,
    };
  } else {
    console.log(`[Storage] R2 credentials not configured. Saving archive "${fileName}" locally to ${getLocalStorageDir()}`);
    await ensureLocalStorageDir();
    const filePath = getLocalFilePath(key);
    const writeStream = fs.createWriteStream(filePath);
    let writtenBytes = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => {
        writtenBytes += chunk.length;
        if (onProgress) onProgress(writtenBytes);
      });
      stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      stream.on("error", reject);
    });

    // Schedule auto-purge after expiry
    setTimeout(async () => {
      try {
        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
      } catch (e) {
        console.warn(`Failed to cleanup local download file ${key}:`, e);
      }
    }, expiryMilliseconds).unref();

    const downloadUrl = `/api/download/file/${encodeURIComponent(key)}`;
    console.log(`[Storage] Local export complete (${writtenBytes} bytes). Local URL: ${downloadUrl}`);
    return {
      key,
      sizeBytes: writtenBytes,
      downloadUrl,
      expiresAt,
    };
  }
};

/**
 * Generates a time-limited R2 download URL or a local route.
 */
export const getDownloadUrl = async (
  key: string,
  fileName: string = `dump_${Date.now()}.zip`,
  expiresInSeconds?: number,
): Promise<string> => {
  const { bucketName } = getR2Config();
  const expiry = expiresInSeconds ?? Math.ceil(getExpiryMilliseconds() / 1000);

  if (isR2Configured()) {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    });
    return await getSignedUrl(s3, command, { expiresIn: expiry });
  } else {
    return `/api/download/file/${encodeURIComponent(key)}`;
  }
};
