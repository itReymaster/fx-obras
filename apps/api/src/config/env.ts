import path from "node:path";

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3333),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR ?? "uploads/construction-opportunities",
  sqlDialect: process.env.SQL_DIALECT ?? "sqlite",
  sqlServerHost: process.env.SQLSERVER_HOST ?? "localhost",
  sqlServerPort: toNumber(process.env.SQLSERVER_PORT, 1433),
  sqlServerDatabase: process.env.SQLSERVER_DATABASE ?? "fx_obras",
  sqlServerUsername: process.env.SQLSERVER_USERNAME ?? "sa",
  sqlServerPassword: process.env.SQLSERVER_PASSWORD ?? "",
  sqlServerEncrypt: (process.env.SQLSERVER_ENCRYPT ?? "false") === "true",
  sqlServerTrustServerCertificate: (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE ?? "true") === "true",
  maxPhotosPerOpportunity: toNumber(process.env.MAX_PHOTOS_PER_OPPORTUNITY, 15),
  maxPhotoSizeMb: toNumber(process.env.MAX_PHOTO_SIZE_MB, 10),
  appName: process.env.APP_NAME ?? "Obras Prospect",
  appCodePrefix: process.env.APP_CODE_PREFIX ?? "OBR",
  resendApiKey: process.env.RESEND_API_KEY,
  notificationEmail: process.env.NOTIFICATION_EMAIL ?? "imarcesil@gmail.com",
};

export const absoluteUploadDir = path.resolve(process.cwd(), env.uploadDir);
