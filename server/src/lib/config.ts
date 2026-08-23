import "dotenv/config";

const env = process.env;

export const config = {
  port: env.PORT ? parseInt(env.PORT) : 3000,
  nodeEnv: env.NODE_ENV,
  posthog: {
    apiKey: env.POSTHOG_API_KEY,
    host: env.POSTHOG_HOST,
    projectId: env.POSTHOG_PROJECT_ID,
    personalApiKey: env.POSTHOG_PERSONAL_API_KEY,
  },
  telemetry: {
    hostedDomain: env.DB_MOVER_HOSTED_DOMAIN || "dbmover.cloud",
    deployment: env.DB_MOVER_DEPLOYMENT,
    centralRelayUrl:
      env.DB_MOVER_CENTRAL_TELEMETRY_URL || "https://dbmover.cloud/api/telemetry/event",
    appVersion: env.DB_MOVER_VERSION,
  },
  storage: {
    accountId: env.R2_ACCOUNT_ID?.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID?.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY?.trim(),
    bucketName: env.R2_BUCKET_NAME?.trim(),
    presignedExpiresSeconds: parseInt(env.R2_PRESIGNED_EXPIRES_SECONDS || "7200", 10),
    downloadDirectory: env.DOWNLOAD_STORAGE_DIR || "/tmp/dbmover-downloads",
  },
};
