import { randomUUID } from "node:crypto";
import { QueryTypes } from "sequelize";
import { env } from "../../../config/env.js";
import { sanitizeSqlReplacements } from "../../../shared/database/sql-dates.js";
/** Prefixo de schema — UserService do Flex permanece em dbo; nunca alterar DEFAULT_SCHEMA dele. */
const S = env.sqlServerSchema;
const Opp = `${S}.ConstructionOpportunity`;
const Photo = `${S}.ConstructionOpportunityPhoto`;
const Hist = `${S}.ConstructionOpportunityHistory`;
const mapPhotoRow = (row) => ({
    id: String(row.id),
    constructionOpportunityId: row.constructionOpportunityId
        ? String(row.constructionOpportunityId)
        : undefined,
    originalName: String(row.originalName),
    relativePath: String(row.relativePath),
    thumbnailRelativePath: row.thumbnailRelativePath ? String(row.thumbnailRelativePath) : undefined,
    mimeType: String(row.mimeType),
    isPrimary: Boolean(row.isPrimary),
});
const mapHistoryRow = (row) => ({
    id: String(row.id),
    constructionOpportunityId: String(row.constructionOpportunityId),
    action: String(row.action),
    previousValue: row.previousValue ?? null,
    newValue: row.newValue ?? null,
    description: row.description ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
});
const parseTags = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map(String);
    if (typeof value !== "string")
        return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [];
    }
    catch {
        return [];
    }
};
const toOptionalDate = (value) => {
    if (!value)
        return undefined;
    return value instanceof Date ? value : new Date(String(value));
};
const mapOpportunityRow = (row, photos = [], history = []) => ({
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    description: row.description ?? undefined,
    constructionType: row.constructionType ?? undefined,
    constructionStage: row.constructionStage ?? undefined,
    commercialPotential: row.commercialPotential ?? undefined,
    status: String(row.status),
    addressSource: row.addressSource ?? undefined,
    postalCode: row.postalCode ?? undefined,
    street: row.street ?? undefined,
    number: row.number ?? undefined,
    withoutNumber: Boolean(row.withoutNumber),
    complement: row.complement ?? undefined,
    district: row.district ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    locationAccuracy: row.locationAccuracy ?? undefined,
    locationCapturedAt: toOptionalDate(row.locationCapturedAt),
    constructionCompany: row.constructionCompany ?? undefined,
    estimatedCompletionDate: toOptionalDate(row.estimatedCompletionDate),
    contactName: row.contactName ?? undefined,
    contactCompany: row.contactCompany ?? undefined,
    contactRole: row.contactRole ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    nextAction: row.nextAction ?? undefined,
    nextActionDate: toOptionalDate(row.nextActionDate),
    notes: row.notes ?? undefined,
    tags: parseTags(row.tags),
    capturedAt: new Date(row.capturedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    createdByUserId: row.createdByUserId ?? undefined,
    updatedByUserId: row.updatedByUserId ?? undefined,
    crmIntegrationStatus: String(row.crmIntegrationStatus ?? "NOT_SENT"),
    // Colunas reais no SQL: crmIntegrationMessage / crmLastAttemptAt
    crmIntegrationError: row.crmIntegrationMessage ?? row.crmIntegrationError ?? undefined,
    crmIntegrationTimestamp: toOptionalDate(row.crmLastAttemptAt ?? row.crmIntegrationTimestamp),
    isDeleted: Boolean(row.isDeleted),
    deletedAt: toOptionalDate(row.deletedAt),
    isTest: Boolean(row.isTest),
    visited: Boolean(row.visited),
    visitedAt: toOptionalDate(row.visitedAt),
    visitedByUserId: row.visitedByUserId ?? undefined,
    photos: photos.map(mapPhotoRow),
    history: history.map((item) => ({
        id: item.id,
        action: item.action,
        description: item.description ?? undefined,
        createdAt: item.createdAt,
    })),
});
export class SequelizeConstructionOpportunityRepository {
    sequelize;
    constructor(sequelize) {
        this.sequelize = sequelize;
    }
    /** Normaliza Date nos replacements (SQL Server 2008 R2 nao aceita offset -03:00). */
    async query(sql, options = {}) {
        const result = await this.sequelize.query(sql, {
            ...options,
            replacements: sanitizeSqlReplacements(options.replacements),
            type: options.type ?? QueryTypes.SELECT,
        });
        return result;
    }
    async findById(id) {
        const record = await this.query(`SELECT TOP 1 * FROM ${Opp} WHERE id = :id AND isDeleted = 0`, { replacements: { id }, type: QueryTypes.SELECT });
        if (record.length === 0)
            return null;
        const photos = await this.findPhotosByOpportunityId(id);
        const history = await this.findHistoryByOpportunityId(id);
        return mapOpportunityRow(record[0], photos, history);
    }
    async findByCode(code) {
        const record = await this.query(`SELECT TOP 1 * FROM ${Opp} WHERE code = :code AND isDeleted = 0`, { replacements: { code }, type: QueryTypes.SELECT });
        if (record.length === 0)
            return null;
        const id = String(record[0].id);
        const photos = await this.findPhotosByOpportunityId(id);
        const history = await this.findHistoryByOpportunityId(id);
        return mapOpportunityRow(record[0], photos, history);
    }
    async findAll(query) {
        const { whereSql, replacements } = this.buildWhereClause(query);
        const orderBySql = this.buildOrderBySql(query.sortBy);
        const startRow = (query.page - 1) * query.pageSize + 1;
        const endRow = query.page * query.pageSize;
        const totalResult = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE ${whereSql}`, { replacements, type: QueryTypes.SELECT });
        const items = await this.query(`WITH Ordered AS (
        SELECT
          *,
          ROW_NUMBER() OVER (ORDER BY ${orderBySql}) AS rn
        FROM ${Opp}
        WHERE ${whereSql}
      )
      SELECT *
      FROM Ordered
      WHERE rn BETWEEN :startRow AND :endRow
      ORDER BY rn`, {
            replacements: { ...replacements, startRow, endRow },
            type: QueryTypes.SELECT,
        });
        const opportunityIds = items.map((item) => String(item.id));
        const photos = opportunityIds.length > 0 ? await this.findPhotosByOpportunityIds(opportunityIds) : [];
        const photoGroups = this.groupPhotosByOpportunityId(photos);
        return {
            data: items.map((item) => mapOpportunityRow(item, photoGroups[String(item.id)] ?? [])),
            totalItems: totalResult[0]?.totalItems ?? 0,
        };
    }
    async findLatest(includeTests = false) {
        const result = await this.findAll({
            page: 1,
            pageSize: 8,
            sortBy: "newest",
            isTest: includeTests ? undefined : false,
        });
        return result.data;
    }
    async create(input) {
        const id = randomUUID();
        const createdAt = input.capturedAt ?? new Date();
        const now = new Date();
        await this.query(`INSERT INTO ${Opp} (
        id, code, title, description, constructionType, constructionStage, commercialPotential, status,
        addressSource, postalCode, street, number, withoutNumber, complement, district, city, state,
        latitude, longitude, locationAccuracy, locationCapturedAt, constructionCompany, estimatedCompletionDate,
        contactName, contactCompany, contactRole, contactPhone, contactEmail, nextAction, nextActionDate,
        notes, tags, crmIntegrationStatus, crmExternalId, crmLastAttemptAt, crmIntegrationMessage,
        capturedAt, createdByUserId, updatedByUserId, createdAt, updatedAt, deletedAt, isDeleted, isTest,
        visited, visitedAt, visitedByUserId
      ) VALUES (
        :id, :code, :title, :description, :constructionType, :constructionStage, :commercialPotential, :status,
        :addressSource, :postalCode, :street, :number, :withoutNumber, :complement, :district, :city, :state,
        :latitude, :longitude, :locationAccuracy, :locationCapturedAt, :constructionCompany, :estimatedCompletionDate,
        :contactName, :contactCompany, :contactRole, :contactPhone, :contactEmail, :nextAction, :nextActionDate,
        :notes, :tags, :crmIntegrationStatus, :crmExternalId, :crmLastAttemptAt, :crmIntegrationMessage,
        :capturedAt, :createdByUserId, :updatedByUserId, :createdAt, :updatedAt, :deletedAt, :isDeleted, :isTest,
        :visited, :visitedAt, :visitedByUserId
      )`, {
            replacements: {
                id,
                code: input.code,
                title: input.title,
                description: input.description ?? null,
                constructionType: input.constructionType ?? null,
                constructionStage: input.constructionStage ?? null,
                commercialPotential: input.commercialPotential ?? null,
                status: input.status || "CAPTURED",
                addressSource: input.addressSource ?? null,
                postalCode: input.postalCode ?? null,
                street: input.street ?? null,
                number: input.number ?? null,
                withoutNumber: input.withoutNumber ? 1 : 0,
                complement: input.complement ?? null,
                district: input.district ?? null,
                city: input.city ?? null,
                state: input.state?.toUpperCase() ?? null,
                latitude: input.latitude ?? null,
                longitude: input.longitude ?? null,
                locationAccuracy: input.locationAccuracy ?? null,
                locationCapturedAt: input.locationCapturedAt ?? null,
                constructionCompany: input.constructionCompany ?? null,
                estimatedCompletionDate: input.estimatedCompletionDate ?? null,
                contactName: input.contactName ?? null,
                contactCompany: input.contactCompany ?? null,
                contactRole: input.contactRole ?? null,
                contactPhone: input.contactPhone ?? null,
                contactEmail: input.contactEmail ?? null,
                nextAction: input.nextAction ?? null,
                nextActionDate: input.nextActionDate ?? null,
                notes: input.notes ?? null,
                tags: JSON.stringify(input.tags || []),
                crmIntegrationStatus: "NOT_SENT",
                crmExternalId: null,
                crmLastAttemptAt: null,
                crmIntegrationMessage: null,
                capturedAt: createdAt,
                createdByUserId: input.createdByUserId ?? null,
                updatedByUserId: input.updatedByUserId ?? null,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
                isDeleted: 0,
                isTest: input.isTest ? 1 : 0,
                visited: input.visited ? 1 : 0,
                visitedAt: input.visitedAt ?? null,
                visitedByUserId: input.visitedByUserId ?? null,
            },
            type: QueryTypes.INSERT,
        });
        const created = await this.findById(id);
        if (!created) {
            throw new Error("Failed to reload created opportunity");
        }
        return created;
    }
    async update(id, input) {
        const fields = [];
        const replacements = { id, updatedAt: new Date() };
        const push = (key, column, transform) => {
            const value = input[key];
            if (value === undefined)
                return;
            replacements[column] = transform ? transform(value) : value;
            fields.push(`${column} = :${column}`);
        };
        push("title", "title");
        push("description", "description");
        push("constructionType", "constructionType");
        push("constructionStage", "constructionStage");
        push("commercialPotential", "commercialPotential");
        push("status", "status");
        push("addressSource", "addressSource");
        push("postalCode", "postalCode");
        push("street", "street");
        push("number", "number");
        push("withoutNumber", "withoutNumber", (value) => (value ? 1 : 0));
        push("complement", "complement");
        push("district", "district");
        push("city", "city");
        push("state", "state", (value) => (typeof value === "string" ? value.toUpperCase() : value));
        push("latitude", "latitude");
        push("longitude", "longitude");
        push("locationAccuracy", "locationAccuracy");
        push("locationCapturedAt", "locationCapturedAt");
        push("constructionCompany", "constructionCompany");
        push("estimatedCompletionDate", "estimatedCompletionDate");
        push("contactName", "contactName");
        push("contactCompany", "contactCompany");
        push("contactRole", "contactRole");
        push("contactPhone", "contactPhone");
        push("contactEmail", "contactEmail");
        push("nextAction", "nextAction");
        push("nextActionDate", "nextActionDate");
        push("notes", "notes");
        if (input.tags !== undefined) {
            replacements.tags = JSON.stringify(input.tags);
            fields.push("tags = :tags");
        }
        push("capturedAt", "capturedAt");
        push("isTest", "isTest", (value) => (value ? 1 : 0));
        push("visited", "visited", (value) => (value ? 1 : 0));
        push("visitedAt", "visitedAt");
        push("visitedByUserId", "visitedByUserId");
        push("updatedByUserId", "updatedByUserId");
        // Campos CRM (usados por sendToCrm; nao entram no UpdateOpportunityInput tipado)
        const crmInput = input;
        if (crmInput.crmIntegrationStatus !== undefined) {
            replacements.crmIntegrationStatus = crmInput.crmIntegrationStatus;
            fields.push("crmIntegrationStatus = :crmIntegrationStatus");
        }
        if (crmInput.crmExternalId !== undefined) {
            replacements.crmExternalId = crmInput.crmExternalId;
            fields.push("crmExternalId = :crmExternalId");
        }
        if (crmInput.crmLastAttemptAt !== undefined || crmInput.crmIntegrationTimestamp !== undefined) {
            replacements.crmLastAttemptAt = crmInput.crmLastAttemptAt ?? crmInput.crmIntegrationTimestamp ?? null;
            fields.push("crmLastAttemptAt = :crmLastAttemptAt");
        }
        if (crmInput.crmIntegrationMessage !== undefined || crmInput.crmIntegrationError !== undefined) {
            replacements.crmIntegrationMessage =
                crmInput.crmIntegrationMessage ?? crmInput.crmIntegrationError ?? null;
            fields.push("crmIntegrationMessage = :crmIntegrationMessage");
        }
        fields.push("updatedAt = :updatedAt");
        if (fields.length === 1) {
            const current = await this.findById(id);
            if (!current) {
                throw new Error("Opportunity not found");
            }
            return current;
        }
        await this.query(`UPDATE ${Opp} SET ${fields.join(", ")} WHERE id = :id`, { replacements, type: QueryTypes.UPDATE });
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error("Opportunity not found after update");
        }
        return updated;
    }
    async delete(id) {
        await this.query(`UPDATE ${Opp} SET isDeleted = 1, deletedAt = :deletedAt, updatedAt = :updatedAt WHERE id = :id`, {
            replacements: { id, deletedAt: new Date(), updatedAt: new Date() },
            type: QueryTypes.UPDATE,
        });
    }
    async count(filters) {
        const { whereSql, replacements } = this.buildWhereClause({
            status: filters?.status,
            city: filters?.city,
            isTest: filters?.isTest,
            commercialPotential: filters?.commercialPotential,
        });
        const result = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE ${whereSql}`, { replacements, type: QueryTypes.SELECT });
        return result[0]?.totalItems ?? 0;
    }
    async countByYear(year) {
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const result = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE createdAt >= :start AND createdAt < :end`, { replacements: { start, end }, type: QueryTypes.SELECT });
        return result[0]?.totalItems ?? 0;
    }
    async aggregateByStatus(includeTests = false) {
        const { whereSql, replacements } = this.buildWhereClause({
            isTest: includeTests ? undefined : false,
        });
        const rows = await this.query(`SELECT status, COUNT(1) AS count FROM ${Opp} WHERE ${whereSql} GROUP BY status`, { replacements, type: QueryTypes.SELECT });
        return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
    }
    async aggregateByCreatedByUser(includeTests = false) {
        const { whereSql, replacements } = this.buildWhereClause({
            isTest: includeTests ? undefined : false,
        });
        const rows = await this.query(`SELECT createdByUserId AS userId, COUNT(1) AS count
       FROM ${Opp}
       WHERE ${whereSql}
       GROUP BY createdByUserId`, { replacements, type: QueryTypes.SELECT });
        return rows
            .map((row) => ({ userId: row.userId, count: Number(row.count) }))
            .sort((a, b) => b.count - a.count);
    }
    async countCreatedSince(since, includeTests = false) {
        const { whereSql, replacements } = this.buildWhereClause({
            isTest: includeTests ? undefined : false,
        });
        const result = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE ${whereSql} AND capturedAt >= :since`, { replacements: { ...replacements, since }, type: QueryTypes.SELECT });
        return result[0]?.totalItems ?? 0;
    }
    async countOverdueNextAction(now, includeTests = false) {
        const { whereSql, replacements } = this.buildWhereClause({
            isTest: includeTests ? undefined : false,
        });
        const result = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE ${whereSql} AND nextActionDate < :now AND status NOT IN ('CONVERTED', 'DISCARDED')`, { replacements: { ...replacements, now }, type: QueryTypes.SELECT });
        return result[0]?.totalItems ?? 0;
    }
    async countNotSentToCrm(includeTests = false) {
        const { whereSql, replacements } = this.buildWhereClause({
            isTest: includeTests ? undefined : false,
        });
        const result = await this.query(`SELECT COUNT(1) AS totalItems FROM ${Opp} WHERE ${whereSql} AND crmIntegrationStatus IN ('NOT_SENT', 'ERROR')`, { replacements, type: QueryTypes.SELECT });
        return result[0]?.totalItems ?? 0;
    }
    async getLocations() {
        const rows = await this.sequelize.query(`SELECT DISTINCT state, city, district
       FROM ConstructionOpportunity
       WHERE isDeleted = 0 AND (state IS NOT NULL OR city IS NOT NULL OR district IS NOT NULL)`, { type: QueryTypes.SELECT });
        return rows.map((r) => ({
            state: r.state ? String(r.state) : null,
            city: r.city ? String(r.city) : null,
            district: r.district ? String(r.district) : null,
        }));
    }
    async findPhotosByOpportunityId(constructionOpportunityId) {
        const rows = await this.query(`SELECT * FROM ${Photo} WHERE constructionOpportunityId = :constructionOpportunityId ORDER BY isPrimary DESC, createdAt ASC`, { replacements: { constructionOpportunityId }, type: QueryTypes.SELECT });
        return rows.map(mapPhotoRow);
    }
    async findPhotoById(constructionOpportunityId, photoId) {
        const rows = await this.query(`SELECT TOP 1 * FROM ${Photo} WHERE constructionOpportunityId = :constructionOpportunityId AND id = :photoId`, { replacements: { constructionOpportunityId, photoId }, type: QueryTypes.SELECT });
        return rows.length > 0 ? mapPhotoRow(rows[0]) : null;
    }
    async findPhotosByOpportunityIds(constructionOpportunityIds) {
        const rows = await this.query(`SELECT * FROM ${Photo} WHERE constructionOpportunityId IN (:constructionOpportunityIds) ORDER BY constructionOpportunityId, isPrimary DESC, createdAt ASC`, { replacements: { constructionOpportunityIds }, type: QueryTypes.SELECT });
        return rows.map(mapPhotoRow);
    }
    async createPhoto(constructionOpportunityId, input) {
        const id = randomUUID();
        const createdAt = new Date();
        await this.query(`INSERT INTO ${Photo} (
        id, constructionOpportunityId, originalName, storedName, relativePath, thumbnailRelativePath,
        mimeType, size, isPrimary, createdAt
      ) VALUES (
        :id, :constructionOpportunityId, :originalName, :storedName, :relativePath, :thumbnailRelativePath,
        :mimeType, :size, :isPrimary, :createdAt
      )`, {
            replacements: {
                id,
                constructionOpportunityId,
                originalName: input.originalName,
                storedName: input.storedName,
                relativePath: input.relativePath,
                thumbnailRelativePath: input.thumbnailRelativePath ?? null,
                mimeType: input.mimeType,
                size: input.size,
                isPrimary: input.isPrimary ? 1 : 0,
                createdAt,
            },
            type: QueryTypes.INSERT,
        });
        const photo = await this.findPhotoById(constructionOpportunityId, id);
        if (!photo) {
            throw new Error("Failed to reload created photo");
        }
        return photo;
    }
    async deletePhoto(constructionOpportunityId, photoId) {
        await this.query(`DELETE FROM ${Photo} WHERE constructionOpportunityId = :constructionOpportunityId AND id = :photoId`, {
            replacements: { constructionOpportunityId, photoId },
            type: QueryTypes.DELETE,
        });
    }
    async setPrimaryPhoto(constructionOpportunityId, photoId) {
        await this.sequelize.transaction(async (transaction) => {
            await this.query(`UPDATE ${Photo} SET isPrimary = 0 WHERE constructionOpportunityId = :constructionOpportunityId`, {
                replacements: { constructionOpportunityId },
                type: QueryTypes.UPDATE,
                transaction,
            });
            await this.query(`UPDATE ${Photo} SET isPrimary = 1 WHERE constructionOpportunityId = :constructionOpportunityId AND id = :photoId`, {
                replacements: { constructionOpportunityId, photoId },
                type: QueryTypes.UPDATE,
                transaction,
            });
        });
    }
    async createHistory(constructionOpportunityId, input) {
        const id = randomUUID();
        const createdAt = new Date();
        await this.query(`INSERT INTO ${Hist} (
        id, constructionOpportunityId, action, previousValue, newValue, description, createdAt
      ) VALUES (
        :id, :constructionOpportunityId, :action, :previousValue, :newValue, :description, :createdAt
      )`, {
            replacements: {
                id,
                constructionOpportunityId,
                action: input.action,
                previousValue: input.previousValue ?? null,
                newValue: input.newValue ?? null,
                description: input.description ?? null,
                createdAt,
            },
            type: QueryTypes.INSERT,
        });
        return { id, constructionOpportunityId, createdAt, ...input };
    }
    async findHistoryByOpportunityId(constructionOpportunityId) {
        const rows = await this.query(`SELECT * FROM ${Hist} WHERE constructionOpportunityId = :constructionOpportunityId ORDER BY createdAt DESC`, { replacements: { constructionOpportunityId }, type: QueryTypes.SELECT });
        return rows.map(mapHistoryRow);
    }
    async findLatestHistoryByOpportunityId(constructionOpportunityId) {
        const rows = await this.query(`SELECT TOP 1 * FROM ${Hist} WHERE constructionOpportunityId = :constructionOpportunityId ORDER BY createdAt DESC`, { replacements: { constructionOpportunityId }, type: QueryTypes.SELECT });
        return rows.length > 0 ? mapHistoryRow(rows[0]) : null;
    }
    groupPhotosByOpportunityId(photos) {
        return photos.reduce((acc, photo) => {
            const key = photo.constructionOpportunityId ?? "";
            if (!key)
                return acc;
            acc[key] ??= [];
            acc[key].push(photo);
            return acc;
        }, {});
    }
    buildOrderBySql(sortBy) {
        if (sortBy === "oldest")
            return "capturedAt ASC";
        if (sortBy === "title")
            return "title ASC";
        if (sortBy === "city")
            return "city ASC";
        if (sortBy === "district")
            return "district ASC";
        if (sortBy === "commercialPotential")
            return "commercialPotential DESC";
        if (sortBy === "nextActionDate")
            return "nextActionDate ASC";
        return "capturedAt DESC";
    }
    buildWhereClause(filters) {
        const conditions = ["isDeleted = 0"];
        const replacements = {};
        if (filters.search) {
            conditions.push("(title LIKE :searchLike OR notes LIKE :searchLike OR code LIKE :searchLike OR district LIKE :searchLike OR city LIKE :searchLike OR street LIKE :searchLike)");
            replacements.searchLike = `%${filters.search}%`;
        }
        if (filters.city) {
            conditions.push("city LIKE :cityLike");
            replacements.cityLike = `%${filters.city}%`;
        }
        if (filters.state) {
            conditions.push("state = :state");
            replacements.state = filters.state.toUpperCase();
        }
        if (filters.district) {
            conditions.push("district LIKE :districtLike");
            replacements.districtLike = `%${filters.district}%`;
        }
        if (filters.constructionType) {
            conditions.push("constructionType = :constructionType");
            replacements.constructionType = filters.constructionType;
        }
        if (filters.constructionStage) {
            conditions.push("constructionStage = :constructionStage");
            replacements.constructionStage = filters.constructionStage;
        }
        if (filters.status) {
            conditions.push("status = :status");
            replacements.status = filters.status;
        }
        if (filters.commercialPotential) {
            conditions.push("commercialPotential = :commercialPotential");
            replacements.commercialPotential = filters.commercialPotential;
        }
        if (filters.addressSource) {
            conditions.push("addressSource = :addressSource");
            replacements.addressSource = filters.addressSource;
        }
        if (filters.hasContact !== undefined) {
            if (filters.hasContact) {
                conditions.push("(contactName IS NOT NULL OR contactPhone IS NOT NULL OR contactEmail IS NOT NULL)");
            }
            else {
                conditions.push("(contactName IS NULL AND contactPhone IS NULL AND contactEmail IS NULL)");
            }
        }
        if (filters.hasNextAction !== undefined) {
            conditions.push(filters.hasNextAction ? "nextAction IS NOT NULL" : "nextAction IS NULL");
        }
        if (filters.isTest !== undefined) {
            conditions.push("isTest = :isTest");
            replacements.isTest = filters.isTest ? 1 : 0;
        }
        if (filters.visited !== undefined) {
            conditions.push("visited = :visited");
            replacements.visited = filters.visited ? 1 : 0;
        }
        if (filters.createdByUserId) {
            conditions.push("createdByUserId = :createdByUserId");
            replacements.createdByUserId = filters.createdByUserId;
        }
        return { whereSql: conditions.join(" AND "), replacements };
    }
}
