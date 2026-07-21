import { PrismaClient } from "@prisma/client";
import { LocalFileStorageService } from "../src/shared/storage/file-storage-service.js";

const prisma = new PrismaClient();
const storage = new LocalFileStorageService();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let processed = 0;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  const photos = await prisma.constructionOpportunityPhoto.findMany({
    where: { thumbnailRelativePath: null },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[thumb-backfill] fotos pendentes: ${photos.length}`);

  for (const photo of photos) {
    processed += 1;

    try {
      const thumbnailRelativePath = await storage.generateThumbnailFromRelativePath(photo.relativePath);

      if (!thumbnailRelativePath) {
        skipped += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.constructionOpportunityPhoto.update({
          where: { id: photo.id },
          data: { thumbnailRelativePath },
        });
      }

      generated += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[thumb-backfill] falha em ${photo.id}: ${message}`);
    }
  }

  console.log("[thumb-backfill] resumo:", {
    dryRun,
    processed,
    generated,
    skipped,
    failed,
  });
}

main()
  .catch((error) => {
    console.error("[thumb-backfill] erro fatal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
