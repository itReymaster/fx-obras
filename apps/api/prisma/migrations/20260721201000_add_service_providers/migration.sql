-- Service providers catalog and relation to construction opportunities
CREATE TABLE "ServiceProvider" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "city" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME
);

CREATE TABLE "OpportunityServiceProvider" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "constructionOpportunityId" TEXT NOT NULL,
  "serviceProviderId" TEXT NOT NULL,
  "role" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityServiceProvider_constructionOpportunityId_fkey" FOREIGN KEY ("constructionOpportunityId") REFERENCES "ConstructionOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpportunityServiceProvider_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OpportunityServiceProvider_constructionOpportunityId_serviceProviderId_key"
  ON "OpportunityServiceProvider" ("constructionOpportunityId", "serviceProviderId");

CREATE INDEX "ServiceProvider_name_idx" ON "ServiceProvider" ("name");
CREATE INDEX "ServiceProvider_type_idx" ON "ServiceProvider" ("type");
CREATE INDEX "ServiceProvider_isActive_idx" ON "ServiceProvider" ("isActive");
CREATE INDEX "OpportunityServiceProvider_constructionOpportunityId_idx"
  ON "OpportunityServiceProvider" ("constructionOpportunityId");
CREATE INDEX "OpportunityServiceProvider_serviceProviderId_idx"
  ON "OpportunityServiceProvider" ("serviceProviderId");
