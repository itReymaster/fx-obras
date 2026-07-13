-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConstructionOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "constructionType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "constructionStage" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "commercialPotential" TEXT NOT NULL DEFAULT 'NOT_EVALUATED',
    "status" TEXT NOT NULL DEFAULT 'CAPTURED',
    "addressSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "postalCode" TEXT,
    "street" TEXT,
    "number" TEXT,
    "withoutNumber" BOOLEAN NOT NULL DEFAULT false,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "locationAccuracy" REAL,
    "locationCapturedAt" DATETIME,
    "constructionCompany" TEXT,
    "estimatedCompletionDate" DATETIME,
    "contactName" TEXT,
    "contactCompany" TEXT,
    "contactRole" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "nextAction" TEXT,
    "nextActionDate" DATETIME,
    "notes" TEXT,
    "tags" TEXT,
    "crmIntegrationStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "crmExternalId" TEXT,
    "crmLastAttemptAt" DATETIME,
    "crmIntegrationMessage" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isTest" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_ConstructionOpportunity" ("addressSource", "capturedAt", "city", "code", "commercialPotential", "complement", "constructionCompany", "constructionStage", "constructionType", "contactCompany", "contactEmail", "contactName", "contactPhone", "contactRole", "createdAt", "createdByUserId", "crmExternalId", "crmIntegrationMessage", "crmIntegrationStatus", "crmLastAttemptAt", "deletedAt", "description", "district", "estimatedCompletionDate", "id", "isDeleted", "latitude", "locationAccuracy", "locationCapturedAt", "longitude", "nextAction", "nextActionDate", "notes", "number", "postalCode", "state", "status", "street", "tags", "title", "updatedAt", "updatedByUserId", "withoutNumber") SELECT "addressSource", "capturedAt", "city", "code", "commercialPotential", "complement", "constructionCompany", "constructionStage", "constructionType", "contactCompany", "contactEmail", "contactName", "contactPhone", "contactRole", "createdAt", "createdByUserId", "crmExternalId", "crmIntegrationMessage", "crmIntegrationStatus", "crmLastAttemptAt", "deletedAt", "description", "district", "estimatedCompletionDate", "id", "isDeleted", "latitude", "locationAccuracy", "locationCapturedAt", "longitude", "nextAction", "nextActionDate", "notes", "number", "postalCode", "state", "status", "street", "tags", "title", "updatedAt", "updatedByUserId", "withoutNumber" FROM "ConstructionOpportunity";
DROP TABLE "ConstructionOpportunity";
ALTER TABLE "new_ConstructionOpportunity" RENAME TO "ConstructionOpportunity";
CREATE UNIQUE INDEX "ConstructionOpportunity_code_key" ON "ConstructionOpportunity"("code");
CREATE INDEX "ConstructionOpportunity_city_district_idx" ON "ConstructionOpportunity"("city", "district");
CREATE INDEX "ConstructionOpportunity_status_idx" ON "ConstructionOpportunity"("status");
CREATE INDEX "ConstructionOpportunity_constructionType_idx" ON "ConstructionOpportunity"("constructionType");
CREATE INDEX "ConstructionOpportunity_capturedAt_idx" ON "ConstructionOpportunity"("capturedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
