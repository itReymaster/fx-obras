/**
 * ETL: SQLite (Prisma) -> SQL Server schema fx_obras
 *
 * Uso (a partir de apps/api):
 *   npm run db:migrate-sqlite-to-mssql -- --dry-run
 *   npm run db:migrate-sqlite-to-mssql -- --truncate
 *
 * Requer apps/api/.env (ou env do shell) com DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD
 * e SQLSERVER_ENCRYPT / SQLSERVER_TRUST_SERVER_CERTIFICATE para a carga real.
 * DATABASE_URL e opcional: default file:./dev.db (relativo a prisma/schema.prisma).
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { QueryTypes, Sequelize } from "sequelize";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, "../..");
const defaultSqlite = path.resolve(apiRoot, "prisma", "dev.db");

// Prisma resolve file: relativo ao schema (apps/api/prisma). Preferir path absoluto.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${defaultSqlite.replace(/\\/g, "/")}`;
}

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const truncate = args.has("--truncate");

const bit = (value: boolean | null | undefined) => (value ? 1 : 0);

/** DATETIME do 2008 R2 nao aceita offset (ex.: -03:00). Enviar string UTC sem TZ. */
const toSqlDate = (value: Date | string | null | undefined): string | null => {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // yyyy-mm-dd HH:mm:ss.mmm — formato inequivoco para SQL Server
  return date.toISOString().slice(0, 23).replace("T", " ");
};

/** Schema onde o DDL criou as tabelas (docs/sql/fx_obras_schema_2008r2.sql). */
const SCHEMA = process.env.FX_OBRAS_SCHEMA ?? "fx_obras";
const q = (table: string) => `${SCHEMA}.${table}`;

const TARGET_TABLES = [
  "OpportunityServiceProvider",
  "ConstructionOpportunityHistory",
  "ConstructionOpportunityPhoto",
  "ConstructionOpportunity",
  "ServiceProvider",
] as const;

const createSequelize = () => {
  const host = process.env.DB_HOST ?? process.env.SQLSERVER_HOST ?? "localhost";
  const port = Number(process.env.DB_PORT ?? process.env.SQLSERVER_PORT ?? 1433);
  const database = process.env.DB_DATABASE ?? process.env.SQLSERVER_DATABASE ?? "fx_obras";
  const username = process.env.DB_USER ?? process.env.SQLSERVER_USERNAME ?? "sa";
  const password =
    process.env.DB_PASSWORD_B64
      ? Buffer.from(process.env.DB_PASSWORD_B64, "base64").toString("utf-8")
      : (process.env.DB_PASSWORD ?? process.env.SQLSERVER_PASSWORD ?? "");
  const encrypt = (process.env.SQLSERVER_ENCRYPT ?? process.env.DB_ENCRYPT ?? "false") === "true";
  const trust =
    (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE ?? process.env.DB_TRUST_SERVER_CERTIFICATE ?? "true") ===
    "true";

  if (!password) {
    throw new Error("DB_PASSWORD (ou DB_PASSWORD_B64) nao definido. Configure apps/api/.env");
  }

  console.log(`[etl] target ${username}@${host}:${port}/${database} schema=${SCHEMA} encrypt=${encrypt}`);

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect: "mssql",
    logging: false,
    dialectOptions: {
      options: {
        encrypt,
        trustServerCertificate: trust,
        enableArithAbort: true,
      },
    },
  });
};

const assertSchemaReady = async (sequelize: Sequelize) => {
  const rows = await sequelize.query<{ name: string }>(
    `SELECT t.name AS name
     FROM sys.tables t
     INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
     WHERE s.name = :schema
     ORDER BY t.name`,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const found = new Set(rows.map((r) => r.name));
  console.log(`[etl] tabelas em ${SCHEMA}:`, [...found].join(", ") || "(nenhuma)");

  const missing = TARGET_TABLES.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Tabelas faltando no schema ${SCHEMA}: ${missing.join(", ")}. ` +
        `Rode docs/sql/fx_obras_schema_2008r2.sql no database ${process.env.DB_DATABASE ?? "?"} ` +
        `(USE correto + schema fx_obras).`,
    );
  }
};

const countTarget = async (sequelize: Sequelize, table: string) => {
  const rows = await sequelize.query<{ total: number }>(
    `SELECT COUNT(1) AS total FROM ${q(table)}`,
    { type: QueryTypes.SELECT },
  );
  return Number(rows[0]?.total ?? 0);
};

const truncateTarget = async (sequelize: Sequelize) => {
  console.log("[etl] truncando tabelas alvo (DELETE em ordem de FK)...");
  for (const table of TARGET_TABLES) {
    await sequelize.query(`DELETE FROM ${q(table)}`, { type: QueryTypes.DELETE });
    console.log(`[etl]   DELETE ${q(table)} ok`);
  }
};

async function main() {
  console.log(`[etl] dryRun=${dryRun} truncate=${truncate}`);

  const [
    opportunities,
    photos,
    history,
    providers,
    links,
  ] = await Promise.all([
    prisma.constructionOpportunity.findMany(),
    prisma.constructionOpportunityPhoto.findMany(),
    prisma.constructionOpportunityHistory.findMany(),
    prisma.serviceProvider.findMany(),
    prisma.opportunityServiceProvider.findMany(),
  ]);

  const source = {
    ConstructionOpportunity: opportunities.length,
    ConstructionOpportunityPhoto: photos.length,
    ConstructionOpportunityHistory: history.length,
    ServiceProvider: providers.length,
    OpportunityServiceProvider: links.length,
    isDeleted: opportunities.filter((o) => o.isDeleted).length,
    isTest: opportunities.filter((o) => o.isTest).length,
  };

  console.log("[etl] origem SQLite:", source);

  if (dryRun) {
    console.log("[etl] dry-run: nenhuma escrita no SQL Server.");
    return;
  }

  const sequelize = createSequelize();

  try {
    await sequelize.authenticate();
    console.log("[etl] conexao SQL Server OK");
    await assertSchemaReady(sequelize);

    if (truncate) {
      await truncateTarget(sequelize);
    }

    console.log(`[etl] inserindo ServiceProvider (${providers.length})...`);
    for (const row of providers) {
      await sequelize.query(
        `INSERT INTO ${q("ServiceProvider")} (
          id, name, type, phone, email, city, notes, isActive, createdAt, updatedAt, deletedAt
        ) VALUES (
          :id, :name, :type, :phone, :email, :city, :notes, :isActive, :createdAt, :updatedAt, :deletedAt
        )`,
        {
          replacements: {
            id: row.id,
            name: row.name,
            type: row.type,
            phone: row.phone,
            email: row.email,
            city: row.city,
            notes: row.notes,
            isActive: bit(row.isActive),
            createdAt: toSqlDate(row.createdAt),
            updatedAt: toSqlDate(row.updatedAt),
            deletedAt: toSqlDate(row.deletedAt),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    console.log(`[etl] inserindo ConstructionOpportunity (${opportunities.length})...`);
    for (const row of opportunities) {
      await sequelize.query(
        `INSERT INTO ${q("ConstructionOpportunity")} (
          id, code, title, description, constructionType, constructionStage, commercialPotential,
          status, addressSource, postalCode, street, number, withoutNumber, complement, district,
          city, state, latitude, longitude, locationAccuracy, locationCapturedAt, constructionCompany,
          estimatedCompletionDate, contactName, contactCompany, contactRole, contactPhone, contactEmail,
          nextAction, nextActionDate, notes, tags, crmIntegrationStatus, crmExternalId, crmLastAttemptAt,
          crmIntegrationMessage, capturedAt, createdByUserId, updatedByUserId, createdAt, updatedAt,
          deletedAt, isDeleted, isTest
        ) VALUES (
          :id, :code, :title, :description, :constructionType, :constructionStage, :commercialPotential,
          :status, :addressSource, :postalCode, :street, :number, :withoutNumber, :complement, :district,
          :city, :state, :latitude, :longitude, :locationAccuracy, :locationCapturedAt, :constructionCompany,
          :estimatedCompletionDate, :contactName, :contactCompany, :contactRole, :contactPhone, :contactEmail,
          :nextAction, :nextActionDate, :notes, :tags, :crmIntegrationStatus, :crmExternalId, :crmLastAttemptAt,
          :crmIntegrationMessage, :capturedAt, :createdByUserId, :updatedByUserId, :createdAt, :updatedAt,
          :deletedAt, :isDeleted, :isTest
        )`,
        {
          replacements: {
            id: row.id,
            code: row.code,
            title: row.title,
            description: row.description,
            constructionType: row.constructionType,
            constructionStage: row.constructionStage,
            commercialPotential: row.commercialPotential,
            status: row.status,
            addressSource: row.addressSource,
            postalCode: row.postalCode,
            street: row.street,
            number: row.number,
            withoutNumber: bit(row.withoutNumber),
            complement: row.complement,
            district: row.district,
            city: row.city,
            state: row.state,
            latitude: row.latitude,
            longitude: row.longitude,
            locationAccuracy: row.locationAccuracy,
            locationCapturedAt: toSqlDate(row.locationCapturedAt),
            constructionCompany: row.constructionCompany,
            estimatedCompletionDate: toSqlDate(row.estimatedCompletionDate),
            contactName: row.contactName,
            contactCompany: row.contactCompany,
            contactRole: row.contactRole,
            contactPhone: row.contactPhone,
            contactEmail: row.contactEmail,
            nextAction: row.nextAction,
            nextActionDate: toSqlDate(row.nextActionDate),
            notes: row.notes,
            tags: row.tags,
            crmIntegrationStatus: row.crmIntegrationStatus,
            crmExternalId: row.crmExternalId,
            crmLastAttemptAt: toSqlDate(row.crmLastAttemptAt),
            crmIntegrationMessage: row.crmIntegrationMessage,
            capturedAt: toSqlDate(row.capturedAt),
            createdByUserId: row.createdByUserId,
            updatedByUserId: row.updatedByUserId,
            createdAt: toSqlDate(row.createdAt),
            updatedAt: toSqlDate(row.updatedAt),
            deletedAt: toSqlDate(row.deletedAt),
            isDeleted: bit(row.isDeleted),
            isTest: bit(row.isTest),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    console.log(`[etl] inserindo ConstructionOpportunityPhoto (${photos.length})...`);
    for (const row of photos) {
      await sequelize.query(
        `INSERT INTO ${q("ConstructionOpportunityPhoto")} (
          id, constructionOpportunityId, originalName, storedName, relativePath, thumbnailRelativePath,
          mimeType, size, isPrimary, createdAt
        ) VALUES (
          :id, :constructionOpportunityId, :originalName, :storedName, :relativePath, :thumbnailRelativePath,
          :mimeType, :size, :isPrimary, :createdAt
        )`,
        {
          replacements: {
            id: row.id,
            constructionOpportunityId: row.constructionOpportunityId,
            originalName: row.originalName,
            storedName: row.storedName,
            relativePath: row.relativePath,
            thumbnailRelativePath: row.thumbnailRelativePath,
            mimeType: row.mimeType,
            size: row.size,
            isPrimary: bit(row.isPrimary),
            createdAt: toSqlDate(row.createdAt),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    console.log(`[etl] inserindo ConstructionOpportunityHistory (${history.length})...`);
    for (const row of history) {
      await sequelize.query(
        `INSERT INTO ${q("ConstructionOpportunityHistory")} (
          id, constructionOpportunityId, action, previousValue, newValue, description, createdAt
        ) VALUES (
          :id, :constructionOpportunityId, :action, :previousValue, :newValue, :description, :createdAt
        )`,
        {
          replacements: {
            id: row.id,
            constructionOpportunityId: row.constructionOpportunityId,
            action: row.action,
            previousValue: row.previousValue,
            newValue: row.newValue,
            description: row.description,
            createdAt: toSqlDate(row.createdAt),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    console.log(`[etl] inserindo OpportunityServiceProvider (${links.length})...`);
    for (const row of links) {
      await sequelize.query(
        `INSERT INTO ${q("OpportunityServiceProvider")} (
          id, constructionOpportunityId, serviceProviderId, role, createdAt
        ) VALUES (
          :id, :constructionOpportunityId, :serviceProviderId, :role, :createdAt
        )`,
        {
          replacements: {
            id: row.id,
            constructionOpportunityId: row.constructionOpportunityId,
            serviceProviderId: row.serviceProviderId,
            role: row.role,
            createdAt: toSqlDate(row.createdAt),
          },
          type: QueryTypes.INSERT,
        },
      );
    }

    const target = {
      ConstructionOpportunity: await countTarget(sequelize, "ConstructionOpportunity"),
      ConstructionOpportunityPhoto: await countTarget(sequelize, "ConstructionOpportunityPhoto"),
      ConstructionOpportunityHistory: await countTarget(sequelize, "ConstructionOpportunityHistory"),
      ServiceProvider: await countTarget(sequelize, "ServiceProvider"),
      OpportunityServiceProvider: await countTarget(sequelize, "OpportunityServiceProvider"),
    };

    console.log("[etl] destino SQL Server:", target);

    const mismatches: string[] = [];
    for (const key of [
      "ConstructionOpportunity",
      "ConstructionOpportunityPhoto",
      "ConstructionOpportunityHistory",
      "ServiceProvider",
      "OpportunityServiceProvider",
    ] as const) {
      if (source[key] !== target[key]) {
        mismatches.push(`${key}: origem=${source[key]} destino=${target[key]}`);
      }
    }

    if (mismatches.length > 0) {
      console.error("[etl] FALHA nas contagens:");
      for (const line of mismatches) console.error(`  - ${line}`);
      process.exitCode = 1;
      return;
    }

    console.log("[etl] OK — contagens batem.");
  } finally {
    await sequelize.close();
  }
}

main()
  .catch((error) => {
    console.error("[etl] erro:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
