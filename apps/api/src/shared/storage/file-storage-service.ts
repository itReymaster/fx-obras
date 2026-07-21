import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
  thumbnailRelativePath?: string;
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
  private readonly thumbsRelativeDir = "uploads/construction-opportunities/thumbs";

  private get thumbnailAbsoluteDir() {
    return path.join(absoluteUploadDir, "thumbs");
  }

  private async createThumbnail(inputPath: string, baseName: string): Promise<string | null> {
    try {
      await fs.mkdir(this.thumbnailAbsoluteDir, { recursive: true });
      const thumbnailFileName = `${baseName}.webp`;
      const thumbnailAbsolutePath = path.join(this.thumbnailAbsoluteDir, thumbnailFileName);

      await sharp(inputPath)
        .rotate()
        .resize({ width: 360, height: 360, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(thumbnailAbsolutePath);

      return path.posix.join(this.thumbsRelativeDir, thumbnailFileName);
    } catch {
      return null;
    }
  }

  async save(file: UploadedFile): Promise<StoredFile> {
    await fs.mkdir(absoluteUploadDir, { recursive: true });
    const extension = extensionFromMime(file.mimetype);
    const storedName = `${randomUUID()}.${extension}`;
    const fullPath = path.join(absoluteUploadDir, storedName);
    await fs.writeFile(fullPath, file.buffer);

    const thumbnailRelativePath = file.mimetype.startsWith("image/")
      ? await this.createThumbnail(fullPath, storedName)
      : null;

    return {
      originalName: sanitizeFileName(file.originalname),
      storedName,
      relativePath: path.posix.join("uploads/construction-opportunities", storedName),
      thumbnailRelativePath: thumbnailRelativePath ?? undefined,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async generateThumbnailFromRelativePath(relativePath: string): Promise<string | null> {
    const sourceAbsolutePath = path.resolve(process.cwd(), relativePath);
    const parsed = path.parse(relativePath);
    const baseName = parsed.base;
    return this.createThumbnail(sourceAbsolutePath, baseName);
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
