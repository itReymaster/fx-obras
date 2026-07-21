-- Add optional thumbnail path to support optimized image loading in web/mobile
ALTER TABLE "ConstructionOpportunityPhoto"
ADD COLUMN "thumbnailRelativePath" TEXT;
