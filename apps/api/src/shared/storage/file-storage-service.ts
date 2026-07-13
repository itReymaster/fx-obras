import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { absoluteUploadDir } from "../../config/env.js";

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  size: number;
}

export interface FileStorageService {
  save(file: UploadedFile): Promise<StoredFile>;
  delete(filePath: string): Promise<void>;
}

const extensionFromMime = (mimeType: string): string => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/jpg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
};

const sanitizeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, "_");

export class LocalFileStorageService implements FileStorageService {
  async save(file: UploadedFile): Promise<StoredFile> {
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

  async delete(filePath: string): Promise<void> {
    const fullPath = path.resolve(process.cwd(), filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // Intentionally ignore missing files on cleanup.
    }
  }
}
