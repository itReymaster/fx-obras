function mapPrismaToModel(prismaRecord) {
    return {
        id: prismaRecord.id,
        code: prismaRecord.code,
        title: prismaRecord.title,
        description: prismaRecord.description,
        constructionType: prismaRecord.constructionType,
        constructionStage: prismaRecord.constructionStage,
        commercialPotential: prismaRecord.commercialPotential,
        status: prismaRecord.status,
        addressSource: prismaRecord.addressSource,
        postalCode: prismaRecord.postalCode,
        street: prismaRecord.street,
        number: prismaRecord.number,
        withoutNumber: prismaRecord.withoutNumber,
        complement: prismaRecord.complement,
        district: prismaRecord.district,
        city: prismaRecord.city,
        state: prismaRecord.state,
        latitude: prismaRecord.latitude,
        longitude: prismaRecord.longitude,
        locationAccuracy: prismaRecord.locationAccuracy,
        locationCapturedAt: prismaRecord.locationCapturedAt,
        constructionCompany: prismaRecord.constructionCompany,
        estimatedCompletionDate: prismaRecord.estimatedCompletionDate,
        contactName: prismaRecord.contactName,
        contactCompany: prismaRecord.contactCompany,
        contactRole: prismaRecord.contactRole,
        contactPhone: prismaRecord.contactPhone,
        contactEmail: prismaRecord.contactEmail,
        nextAction: prismaRecord.nextAction,
        nextActionDate: prismaRecord.nextActionDate,
        notes: prismaRecord.notes,
        tags: prismaRecord.tags ? JSON.parse(prismaRecord.tags) : [],
        capturedAt: prismaRecord.capturedAt,
        createdAt: prismaRecord.createdAt,
        updatedAt: prismaRecord.updatedAt,
        createdByUserId: prismaRecord.createdByUserId,
        updatedByUserId: prismaRecord.updatedByUserId,
        crmIntegrationStatus: prismaRecord.crmIntegrationStatus,
        crmIntegrationError: prismaRecord.crmIntegrationError,
        crmIntegrationTimestamp: prismaRecord.crmIntegrationTimestamp,
        isDeleted: prismaRecord.isDeleted,
        deletedAt: prismaRecord.deletedAt,
        isTest: prismaRecord.isTest,
        photos: (prismaRecord.photos || []).map((p) => ({
            id: p.id,
            originalName: p.originalName,
            relativePath: p.relativePath,
            mimeType: p.mimeType,
            isPrimary: p.isPrimary,
        })),
        history: prismaRecord.history
            ? prismaRecord.history.map((h) => ({
                id: h.id,
                action: h.action,
                description: h.description,
                createdAt: h.createdAt,
            }))
            : undefined,
    };
}
export class ConstructionOpportunityRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const record = await this.prisma.constructionOpportunity.findFirst({
            where: { id, isDeleted: false },
            include: { photos: true, history: { orderBy: { createdAt: "desc" } } },
        });
        return record ? mapPrismaToModel(record) : null;
    }
    async findByCode(code) {
        const record = await this.prisma.constructionOpportunity.findFirst({
            where: { code, isDeleted: false },
            include: { photos: true },
        });
        return record ? mapPrismaToModel(record) : null;
    }
    async findAll(query) {
        const where = this.buildWhere(query);
        const skip = (query.page - 1) * query.pageSize;
        const [items, totalItems] = await Promise.all([
            this.prisma.constructionOpportunity.findMany({
                where,
                skip,
                take: query.pageSize,
                orderBy: this.buildOrderBy(query.sortBy),
                include: { photos: true },
            }),
            this.prisma.constructionOpportunity.count({ where }),
        ]);
        return {
            data: items.map(mapPrismaToModel),
            totalItems,
        };
    }
    async create(input) {
        const record = await this.prisma.constructionOpportunity.create({
            data: {
                code: input.code,
                title: input.title,
                description: input.description,
                constructionType: input.constructionType,
                constructionStage: input.constructionStage,
                commercialPotential: input.commercialPotential,
                status: input.status || "CAPTURED",
                addressSource: input.addressSource,
                postalCode: input.postalCode,
                street: input.street,
                number: input.number,
                withoutNumber: input.withoutNumber,
                complement: input.complement,
                district: input.district,
                city: input.city,
                state: input.state?.toUpperCase(),
                latitude: input.latitude,
                longitude: input.longitude,
                locationAccuracy: input.locationAccuracy,
                locationCapturedAt: input.locationCapturedAt,
                constructionCompany: input.constructionCompany,
                estimatedCompletionDate: input.estimatedCompletionDate,
                contactName: input.contactName,
                contactCompany: input.contactCompany,
                contactRole: input.contactRole,
                contactPhone: input.contactPhone,
                contactEmail: input.contactEmail,
                nextAction: input.nextAction,
                nextActionDate: input.nextActionDate,
                notes: input.notes,
                tags: JSON.stringify(input.tags || []),
                capturedAt: input.capturedAt,
                createdByUserId: input.createdByUserId,
                updatedByUserId: input.updatedByUserId,
                crmIntegrationStatus: "NOT_SENT",
                isTest: input.isTest || false,
            },
            include: { photos: true, history: true },
        });
        return mapPrismaToModel(record);
    }
    async update(id, input) {
        const record = await this.prisma.constructionOpportunity.update({
            where: { id },
            data: {
                title: input.title,
                description: input.description,
                constructionType: input.constructionType,
                constructionStage: input.constructionStage,
                commercialPotential: input.commercialPotential,
                status: input.status,
                addressSource: input.addressSource,
                postalCode: input.postalCode,
                street: input.street,
                number: input.number,
                withoutNumber: input.withoutNumber,
                complement: input.complement,
                district: input.district,
                city: input.city,
                state: input.state?.toUpperCase(),
                latitude: input.latitude,
                longitude: input.longitude,
                locationAccuracy: input.locationAccuracy,
                locationCapturedAt: input.locationCapturedAt,
                constructionCompany: input.constructionCompany,
                estimatedCompletionDate: input.estimatedCompletionDate,
                contactName: input.contactName,
                contactCompany: input.contactCompany,
                contactRole: input.contactRole,
                contactPhone: input.contactPhone,
                contactEmail: input.contactEmail,
                nextAction: input.nextAction,
                nextActionDate: input.nextActionDate,
                notes: input.notes,
                tags: input.tags !== undefined ? JSON.stringify(input.tags) : undefined,
                capturedAt: input.capturedAt,
                isTest: input.isTest,
                updatedByUserId: input.updatedByUserId,
            },
            include: { photos: true, history: true },
        });
        return mapPrismaToModel(record);
    }
    async delete(id) {
        await this.prisma.constructionOpportunity.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
    }
    async count(filters) {
        const where = { isDeleted: false };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.city)
            where.city = filters.city;
        if (filters?.isTest !== undefined)
            where.isTest = filters.isTest;
        if (filters?.commercialPotential)
            where.commercialPotential = filters.commercialPotential;
        return this.prisma.constructionOpportunity.count({ where });
    }
    async countByYear(year) {
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        return this.prisma.constructionOpportunity.count({
            where: {
                createdAt: { gte: start, lt: end },
            },
        });
    }
    async aggregateByStatus() {
        const result = await this.prisma.constructionOpportunity.groupBy({
            by: ["status"],
            where: { isDeleted: false },
            _count: true,
        });
        return result.map((r) => ({ status: r.status, count: r._count }));
    }
    buildWhere(query) {
        const andFilters = [{ isDeleted: false }];
        if (query.search) {
            andFilters.push({
                OR: [
                    { title: { contains: query.search } },
                    { notes: { contains: query.search } },
                    { code: { contains: query.search } },
                ],
            });
        }
        if (query.city)
            andFilters.push({ city: query.city });
        if (query.state)
            andFilters.push({ state: query.state.toUpperCase() });
        if (query.district)
            andFilters.push({ district: query.district });
        if (query.constructionType)
            andFilters.push({ constructionType: query.constructionType });
        if (query.constructionStage)
            andFilters.push({ constructionStage: query.constructionStage });
        if (query.status)
            andFilters.push({ status: query.status });
        if (query.commercialPotential)
            andFilters.push({ commercialPotential: query.commercialPotential });
        if (query.addressSource)
            andFilters.push({ addressSource: query.addressSource });
        if (query.hasContact !== undefined) {
            andFilters.push(query.hasContact
                ? { OR: [{ contactName: { not: null } }, { contactPhone: { not: null } }, { contactEmail: { not: null } }] }
                : { AND: [{ contactName: null }, { contactPhone: null }, { contactEmail: null }] });
        }
        if (query.hasNextAction !== undefined) {
            andFilters.push(query.hasNextAction ? { nextAction: { not: null } } : { nextAction: null });
        }
        if (query.isTest !== undefined) {
            andFilters.push({ isTest: query.isTest });
        }
        if (query.createdByUserId) {
            andFilters.push({ createdByUserId: query.createdByUserId });
        }
        return { AND: andFilters };
    }
    buildOrderBy(sortBy) {
        if (sortBy === "oldest")
            return { capturedAt: "asc" };
        if (sortBy === "title")
            return { title: "asc" };
        if (sortBy === "city")
            return { city: "asc" };
        if (sortBy === "commercialPotential")
            return { commercialPotential: "desc" };
        if (sortBy === "nextActionDate")
            return { nextActionDate: "asc" };
        return { capturedAt: "desc" };
    }
}
