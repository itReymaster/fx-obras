import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { absoluteUploadDir } from "../../config/env.js";
const extensionFromMime = (mimeType) => {
    if (mimeType === "image/jpeg")
        return "jpg";
    if (mimeType === "image/jpg")
        return "jpg";
    if (mimeType === "image/png")
        return "png";
    if (mimeType === "image/webp")
        return "webp";
    return "bin";
};
const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
export class LocalFileStorageService {
    async save(file) {
        await fs.mkdir(absoluteUploadDir, { recursive: true });
        const extension = extensionFromMime(file.mimetype);
        const storedName = `${randomUUID()}.${extension}`;
        const fullPath = path.join(absoluteUploadDir, storedName);
        await fs.writeFile(fullPath, file.buffer);
        return {
            originalName: sanitizeFileName(file.originalname),
            storedName,
            relativePath: path.posix.join("uploads/construction-opportunities", storedName),
            mimeType: file.mimetype,
            size: file.size,
        };
    }
    async delete(filePath) {
        const fullPath = path.resolve(process.cwd(), filePath);
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // Intentionally ignore missing files on cleanup.
        }
    }
}
