/**
 * Gera arquivos de thumbnail em disco quando a foto original existe
 * mas o .webp do thumb ainda nao esta presente.
 * Nao altera o banco (os paths ja estao gravados).
 *
 * Uso (apps/api):
 *   npx tsx src/scripts/generate-missing-thumbs-on-disk.ts
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { LocalFileStorageService } from "../shared/storage/file-storage-service.js";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/")}`;
}

const prisma = new PrismaClient();
const storage = new LocalFileStorageService();
const dryRun = process.argv.includes("--dry-run");

async function exists(relativePath: string) {
  try {
    await fs.access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const photos = await prisma.constructionOpportunityPhoto.findMany({
    select: {
      id: true,
      relativePath: true,
      thumbnailRelativePath: true,
    },
  });

  let generated = 0;
  let skippedNoOriginal = 0;
  let skippedThumbOk = 0;
  let failed = 0;

  for (const photo of photos) {
    const hasOriginal = await exists(photo.relativePath);
    if (!hasOriginal) {
      skippedNoOriginal += 1;
      continue;
    }

    if (photo.thumbnailRelativePath && (await exists(photo.thumbnailRelativePath))) {
      skippedThumbOk += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] gerar thumb para ${photo.relativePath}`);
      generated += 1;
      continue;
    }

    try {
      const thumb = await storage.generateThumbnailFromRelativePath(photo.relativePath);
      if (!thumb) {
        failed += 1;
        continue;
      }
      generated += 1;
      console.log(`[ok] ${thumb}`);
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${photo.relativePath}`, error);
    }
  }

  console.log(
    JSON.stringify(
      { total: photos.length, generated, skippedNoOriginal, skippedThumbOk, failed, dryRun },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
