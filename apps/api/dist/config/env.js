import path from "node:path";
const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT, 3333),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    uploadDir: process.env.UPLOAD_DIR ?? "uploads/construction-opportunities",
    maxPhotosPerOpportunity: toNumber(process.env.MAX_PHOTOS_PER_OPPORTUNITY, 15),
    maxPhotoSizeMb: toNumber(process.env.MAX_PHOTO_SIZE_MB, 10),
    appName: process.env.APP_NAME ?? "Obras Prospect",
    appCodePrefix: process.env.APP_CODE_PREFIX ?? "OBR",
};
export const absoluteUploadDir = path.resolve(process.cwd(), env.uploadDir);
