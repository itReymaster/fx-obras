import path from "node:path";

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const erpFlexHost = process.env.ERP_FLEX_SQLSERVER_HOST ?? process.env.DB_HOST;
const erpFlexPort = process.env.ERP_FLEX_SQLSERVER_PORT ?? process.env.DB_PORT;
const erpFlexDatabase = process.env.ERP_FLEX_SQLSERVER_DATABASE ?? process.env.DB_DATABASE;
const erpFlexUsername = process.env.ERP_FLEX_SQLSERVER_USERNAME ?? process.env.DB_USER;
const erpFlexPassword = process.env.ERP_FLEX_SQLSERVER_PASSWORD ?? process.env.DB_PASSWORD;

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
  erpFlexSqlHost: erpFlexHost ?? "200.195.141.5",
  erpFlexSqlPort: toNumber(erpFlexPort, 61433),
  erpFlexSqlDatabase: erpFlexDatabase ?? "Flex",
  erpFlexSqlUsername: erpFlexUsername ?? "UserService",
  erpFlexSqlPassword: erpFlexPassword ?? "",
  erpFlexSqlEncrypt: (process.env.ERP_FLEX_SQLSERVER_ENCRYPT ?? "false") === "true",
  erpFlexSqlTrustServerCertificate: (process.env.ERP_FLEX_SQLSERVER_TRUST_SERVER_CERTIFICATE ?? "true") === "true",
  erpFlexLoginProcedure: process.env.ERP_FLEX_SQLSERVER_LOGIN_PROCEDURE ?? "dbo.SPAuthLogin",
  maxPhotosPerOpportunity: toNumber(process.env.MAX_PHOTOS_PER_OPPORTUNITY, 15),
  maxPhotoSizeMb: toNumber(process.env.MAX_PHOTO_SIZE_MB, 10),
  appName: process.env.APP_NAME ?? "Obras Prospect",
  appCodePrefix: process.env.APP_CODE_PREFIX ?? "OBR",
  resendApiKey: process.env.RESEND_API_KEY,
  notificationEmail: process.env.NOTIFICATION_EMAIL ?? "imarcesil@gmail.com",
};

export const absoluteUploadDir = path.resolve(process.cwd(), env.uploadDir);
