-- AlterTable
ALTER TABLE "ConstructionOpportunity" ADD COLUMN "visited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConstructionOpportunity" ADD COLUMN "visitedAt" DATETIME;
ALTER TABLE "ConstructionOpportunity" ADD COLUMN "visitedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_visited_idx" ON "ConstructionOpportunity"("visited");
