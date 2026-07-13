-- CreateTable
CREATE TABLE "ConstructionOpportunity" (
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
    "isDeleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ConstructionOpportunityPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "constructionOpportunityId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConstructionOpportunityPhoto_constructionOpportunityId_fkey" FOREIGN KEY ("constructionOpportunityId") REFERENCES "ConstructionOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConstructionOpportunityHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "constructionOpportunityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConstructionOpportunityHistory_constructionOpportunityId_fkey" FOREIGN KEY ("constructionOpportunityId") REFERENCES "ConstructionOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionOpportunity_code_key" ON "ConstructionOpportunity"("code");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_city_district_idx" ON "ConstructionOpportunity"("city", "district");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_status_idx" ON "ConstructionOpportunity"("status");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_constructionType_idx" ON "ConstructionOpportunity"("constructionType");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_capturedAt_idx" ON "ConstructionOpportunity"("capturedAt");

-- CreateIndex
CREATE INDEX "ConstructionOpportunityPhoto_constructionOpportunityId_idx" ON "ConstructionOpportunityPhoto"("constructionOpportunityId");

-- CreateIndex
CREATE INDEX "ConstructionOpportunityHistory_constructionOpportunityId_createdAt_idx" ON "ConstructionOpportunityHistory"("constructionOpportunityId", "createdAt");
