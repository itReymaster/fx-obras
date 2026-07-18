import path from "node:path";
const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const stripWrappingQuotes = (value) => {
    if (!value)
        return value;
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
            return trimmed.slice(1, -1);
        }
    }
    return trimmed;
};
const dbHost = stripWrappingQuotes(process.env.DB_HOST ?? process.env.SQLSERVER_HOST);
const dbPort = stripWrappingQuotes(process.env.DB_PORT ?? process.env.SQLSERVER_PORT);
const dbDatabase = stripWrappingQuotes(process.env.DB_DATABASE ?? process.env.SQLSERVER_DATABASE);
const dbUsername = stripWrappingQuotes(process.env.DB_USER ?? process.env.SQLSERVER_USERNAME);
const dbPassword = stripWrappingQuotes(process.env.DB_PASSWORD ?? process.env.SQLSERVER_PASSWORD);
export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT, 3333),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    uploadDir: process.env.UPLOAD_DIR ?? "uploads/construction-opportunities",
    sqlDialect: process.env.SQL_DIALECT ?? "sqlite",
    sqlServerHost: dbHost ?? "localhost",
    sqlServerPort: toNumber(dbPort, 1433),
    sqlServerDatabase: dbDatabase ?? "fx_obras",
    sqlServerUsername: dbUsername ?? "sa",
    sqlServerPassword: dbPassword ?? "",
    sqlServerEncrypt: (process.env.SQLSERVER_ENCRYPT ?? "false") === "true",
    sqlServerTrustServerCertificate: (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE ?? "true") === "true",
    erpFlexSqlHost: dbHost ?? "200.195.141.5",
    erpFlexSqlPort: toNumber(dbPort, 1433),
    erpFlexSqlDatabase: dbDatabase ?? "Flex",
    erpFlexSqlUsername: dbUsername ?? "UserService",
    erpFlexSqlPassword: dbPassword ?? "",
    erpFlexSqlEncrypt: (process.env.DB_ENCRYPT ?? process.env.SQLSERVER_ENCRYPT ?? "false") === "true",
    erpFlexSqlTrustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE ?? "true") === "true",
    erpFlexLoginProcedure: process.env.DB_LOGIN_PROCEDURE ?? "dbo.SPAuthLogin",
    maxPhotosPerOpportunity: toNumber(process.env.MAX_PHOTOS_PER_OPPORTUNITY, 15),
    maxPhotoSizeMb: toNumber(process.env.MAX_PHOTO_SIZE_MB, 10),
    appName: process.env.APP_NAME ?? "Obras Prospect",
    appCodePrefix: process.env.APP_CODE_PREFIX ?? "OBR",
    resendApiKey: process.env.RESEND_API_KEY,
    notificationEmail: process.env.NOTIFICATION_EMAIL ?? "imarcesil@gmail.com",
};
export const absoluteUploadDir = path.resolve(process.cwd(), env.uploadDir);
