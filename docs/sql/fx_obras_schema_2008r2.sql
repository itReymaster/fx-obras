-- fx_obras schema for SQL Server 2008 R2
-- Fonte: docs/tutorial-migracao-sqlserver-2008r2.md (Fase A)
--
-- Antes de executar:
-- 1) Substitua [SEU_BANCO] pelo valor real de DB_DATABASE (homolog).
-- 2) Confirme backup do database alvo (docs/sqlserver-backup-pre-migration.sql).
-- 3) O LOGIN [fx_obras_app] deve existir no servidor (ou ajuste o nome do usuario).
-- 4) Rode primeiro em homologacao. Nao execute em producao sem ensaio.

USE [SEU_BANCO];
GO

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'fx_obras')
BEGIN
  EXEC('CREATE SCHEMA fx_obras AUTHORIZATION dbo;');
END
GO

/* ------------------------------------------------------------------ */
/* Usuario do app (requer LOGIN server-level ja criado)               */
/* ------------------------------------------------------------------ */

IF NOT EXISTS (
  SELECT 1 FROM sys.database_principals WHERE name = 'fx_obras_app'
)
BEGIN
  CREATE USER [fx_obras_app] FOR LOGIN [fx_obras_app];
END
GO

ALTER USER [fx_obras_app] WITH DEFAULT_SCHEMA = [fx_obras];
GO

-- Homologacao / migracao (temporario). Apos estabilizar, remova db_owner
-- e aplique os GRANTs restritos no final deste arquivo.
IF NOT EXISTS (
  SELECT 1
  FROM sys.database_role_members rm
  INNER JOIN sys.database_principals r ON r.principal_id = rm.role_principal_id
  INNER JOIN sys.database_principals m ON m.principal_id = rm.member_principal_id
  WHERE r.name = 'db_owner' AND m.name = 'fx_obras_app'
)
BEGIN
  ALTER ROLE db_owner ADD MEMBER [fx_obras_app];
END
GO

/* ------------------------------------------------------------------ */
/* Tabelas                                                            */
/* ------------------------------------------------------------------ */

IF OBJECT_ID(N'fx_obras.ConstructionOpportunity', N'U') IS NULL
BEGIN
  CREATE TABLE fx_obras.ConstructionOpportunity (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    code NVARCHAR(50) NOT NULL,
    title NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    constructionType NVARCHAR(50) NOT NULL,
    constructionStage NVARCHAR(50) NOT NULL,
    commercialPotential NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) NOT NULL,
    addressSource NVARCHAR(50) NOT NULL,
    postalCode NVARCHAR(20) NULL,
    street NVARCHAR(255) NULL,
    number NVARCHAR(50) NULL,
    withoutNumber BIT NOT NULL CONSTRAINT DF_Opp_WithoutNumber DEFAULT 0,
    complement NVARCHAR(255) NULL,
    district NVARCHAR(255) NULL,
    city NVARCHAR(255) NULL,
    state NVARCHAR(2) NULL,
    latitude FLOAT NULL,
    longitude FLOAT NULL,
    locationAccuracy FLOAT NULL,
    locationCapturedAt DATETIME NULL,
    constructionCompany NVARCHAR(255) NULL,
    estimatedCompletionDate DATETIME NULL,
    contactName NVARCHAR(255) NULL,
    contactCompany NVARCHAR(255) NULL,
    contactRole NVARCHAR(255) NULL,
    contactPhone NVARCHAR(50) NULL,
    contactEmail NVARCHAR(255) NULL,
    nextAction NVARCHAR(255) NULL,
    nextActionDate DATETIME NULL,
    notes NVARCHAR(MAX) NULL,
    tags NVARCHAR(MAX) NULL,
    crmIntegrationStatus NVARCHAR(50) NOT NULL CONSTRAINT DF_Opp_CrmStatus DEFAULT N'NOT_SENT',
    crmExternalId NVARCHAR(255) NULL,
    crmLastAttemptAt DATETIME NULL,
    crmIntegrationMessage NVARCHAR(MAX) NULL,
    capturedAt DATETIME NOT NULL,
    createdByUserId NVARCHAR(100) NULL,
    updatedByUserId NVARCHAR(100) NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    deletedAt DATETIME NULL,
    isDeleted BIT NOT NULL CONSTRAINT DF_Opp_IsDeleted DEFAULT 0,
    isTest BIT NOT NULL CONSTRAINT DF_Opp_IsTest DEFAULT 0,
    CONSTRAINT UQ_Opp_Code UNIQUE (code)
  );
END
GO

IF OBJECT_ID(N'fx_obras.ConstructionOpportunityPhoto', N'U') IS NULL
BEGIN
  CREATE TABLE fx_obras.ConstructionOpportunityPhoto (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
    originalName NVARCHAR(255) NOT NULL,
    storedName NVARCHAR(255) NOT NULL,
    relativePath NVARCHAR(500) NOT NULL,
    thumbnailRelativePath NVARCHAR(500) NULL,
    mimeType NVARCHAR(100) NOT NULL,
    size INT NOT NULL,
    isPrimary BIT NOT NULL CONSTRAINT DF_Photo_IsPrimary DEFAULT 0,
    createdAt DATETIME NOT NULL,
    CONSTRAINT FK_Photo_Opportunity FOREIGN KEY (constructionOpportunityId)
      REFERENCES fx_obras.ConstructionOpportunity(id)
      ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'fx_obras.ConstructionOpportunityHistory', N'U') IS NULL
BEGIN
  CREATE TABLE fx_obras.ConstructionOpportunityHistory (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
    action NVARCHAR(100) NOT NULL,
    previousValue NVARCHAR(MAX) NULL,
    newValue NVARCHAR(MAX) NULL,
    description NVARCHAR(MAX) NULL,
    createdAt DATETIME NOT NULL,
    CONSTRAINT FK_History_Opportunity FOREIGN KEY (constructionOpportunityId)
      REFERENCES fx_obras.ConstructionOpportunity(id)
      ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID(N'fx_obras.ServiceProvider', N'U') IS NULL
BEGIN
  CREATE TABLE fx_obras.ServiceProvider (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    type NVARCHAR(100) NOT NULL,
    phone NVARCHAR(50) NULL,
    email NVARCHAR(255) NULL,
    city NVARCHAR(255) NULL,
    notes NVARCHAR(MAX) NULL,
    isActive BIT NOT NULL CONSTRAINT DF_Provider_IsActive DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    deletedAt DATETIME NULL
  );
END
GO

IF OBJECT_ID(N'fx_obras.OpportunityServiceProvider', N'U') IS NULL
BEGIN
  CREATE TABLE fx_obras.OpportunityServiceProvider (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    constructionOpportunityId UNIQUEIDENTIFIER NOT NULL,
    serviceProviderId UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(100) NULL,
    createdAt DATETIME NOT NULL,
    CONSTRAINT FK_OppProv_Opportunity FOREIGN KEY (constructionOpportunityId)
      REFERENCES fx_obras.ConstructionOpportunity(id)
      ON DELETE CASCADE,
    CONSTRAINT FK_OppProv_Provider FOREIGN KEY (serviceProviderId)
      REFERENCES fx_obras.ServiceProvider(id)
      ON DELETE CASCADE,
    CONSTRAINT UQ_OppProv UNIQUE (constructionOpportunityId, serviceProviderId)
  );
END
GO

/* ------------------------------------------------------------------ */
/* Indices                                                            */
/* ------------------------------------------------------------------ */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Opportunity_City_District' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunity'))
  CREATE INDEX IX_Opportunity_City_District ON fx_obras.ConstructionOpportunity(city, district);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Opportunity_Status' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunity'))
  CREATE INDEX IX_Opportunity_Status ON fx_obras.ConstructionOpportunity(status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Opportunity_ConstructionType' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunity'))
  CREATE INDEX IX_Opportunity_ConstructionType ON fx_obras.ConstructionOpportunity(constructionType);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Opportunity_CapturedAt' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunity'))
  CREATE INDEX IX_Opportunity_CapturedAt ON fx_obras.ConstructionOpportunity(capturedAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Photo_OpportunityId' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunityPhoto'))
  CREATE INDEX IX_Photo_OpportunityId ON fx_obras.ConstructionOpportunityPhoto(constructionOpportunityId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_History_OpportunityId_CreatedAt' AND object_id = OBJECT_ID(N'fx_obras.ConstructionOpportunityHistory'))
  CREATE INDEX IX_History_OpportunityId_CreatedAt ON fx_obras.ConstructionOpportunityHistory(constructionOpportunityId, createdAt);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Provider_Name' AND object_id = OBJECT_ID(N'fx_obras.ServiceProvider'))
  CREATE INDEX IX_Provider_Name ON fx_obras.ServiceProvider(name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Provider_Type' AND object_id = OBJECT_ID(N'fx_obras.ServiceProvider'))
  CREATE INDEX IX_Provider_Type ON fx_obras.ServiceProvider(type);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Provider_IsActive' AND object_id = OBJECT_ID(N'fx_obras.ServiceProvider'))
  CREATE INDEX IX_Provider_IsActive ON fx_obras.ServiceProvider(isActive);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OppProv_OpportunityId' AND object_id = OBJECT_ID(N'fx_obras.OpportunityServiceProvider'))
  CREATE INDEX IX_OppProv_OpportunityId ON fx_obras.OpportunityServiceProvider(constructionOpportunityId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OppProv_ProviderId' AND object_id = OBJECT_ID(N'fx_obras.OpportunityServiceProvider'))
  CREATE INDEX IX_OppProv_ProviderId ON fx_obras.OpportunityServiceProvider(serviceProviderId);
GO

/* ------------------------------------------------------------------ */
/* Validacao                                                          */
/* ------------------------------------------------------------------ */

SELECT s.name AS schema_name, t.name AS table_name
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'fx_obras'
ORDER BY t.name;
GO

SELECT name AS collation_name
FROM sys.databases
WHERE name = DB_NAME();
GO

/*
-- Apos estabilizar em producao, apertar permissoes:

USE [SEU_BANCO];
GO
ALTER ROLE db_owner DROP MEMBER [fx_obras_app];
GO
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::fx_obras TO [fx_obras_app];
GRANT ALTER, CONTROL ON SCHEMA::fx_obras TO [fx_obras_app];
GO
*/
