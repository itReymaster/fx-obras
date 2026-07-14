import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { sendOpportunityNotification } from "../../../shared/email/email-service.js";
import { MockCrmIntegrationService, } from "../../../shared/integrations/crm/crm-integration-service.js";
import { LocalFileStorageService, } from "../../../shared/storage/file-storage-service.js";
import { ConstructionOpportunityExportMapper } from "../mappers/construction-opportunity-export.mapper.js";
import { ConstructionOpportunityRepository } from "../repositories/construction-opportunity.repository.js";
import { CreateOpportunityUseCase, UpdateOpportunityUseCase, GetOpportunityByIdUseCase, ListOpportunitiesUseCase, } from "../use-cases/index.js";
/**
 * Service Layer - Orquestrador de casos de uso e operações específicas de domínio
 */
export class ConstructionOpportunitiesService {
    prisma;
    fileStorage;
    crmIntegrationService;
    repository;
    createUseCase;
    updateUseCase;
    getUseCase;
    listUseCase;
    constructor(prisma, fileStorage = new LocalFileStorageService(), crmIntegrationService = new MockCrmIntegrationService()) {
        this.prisma = prisma;
        this.fileStorage = fileStorage;
        this.crmIntegrationService = crmIntegrationService;
        this.repository = new ConstructionOpportunityRepository(prisma);
        this.createUseCase = new CreateOpportunityUseCase(this.repository);
        this.updateUseCase = new UpdateOpportunityUseCase(this.repository);
        this.getUseCase = new GetOpportunityByIdUseCase(this.repository);
        this.listUseCase = new ListOpportunitiesUseCase(this.repository);
    }
    async create(input) {
        const created = await this.createUseCase.execute(input);
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: created.id,
                action: "CREATED",
                description: "Opportunity created",
            },
        });
        void sendOpportunityNotification("created", created);
        return {
            ...created,
            tags: created.tags,
        };
    }
    async list(query) {
        return await this.listUseCase.execute(query);
    }
    async getById(id) {
        const opportunity = await this.getUseCase.execute(id);
        const history = await this.prisma.constructionOpportunityHistory.findMany({
            where: { constructionOpportunityId: id },
            orderBy: { createdAt: "desc" },
        });
        return {
            ...opportunity,
            tags: opportunity.tags,
            history,
        };
    }
    async update(id, input) {
        const updated = await this.updateUseCase.execute(id, input);
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "UPDATED",
                description: "Opportunity updated",
            },
        });
        void sendOpportunityNotification("updated", updated);
        return {
            ...updated,
            tags: updated.tags,
        };
    }
    async softDelete(id) {
        await this.getById(id);
        await this.prisma.constructionOpportunity.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "DELETED",
                description: "Opportunity soft deleted",
            },
        });
    }
    async addPhotos(id, files) {
        const opportunity = await this.getById(id);
        const currentCount = opportunity.photos.length;
        if (currentCount + files.length > env.maxPhotosPerOpportunity) {
            throw new AppError(`Photo limit exceeded. Max allowed: ${env.maxPhotosPerOpportunity}`, 422);
        }
        const createdPhotos = [];
        for (const file of files) {
            const stored = await this.fileStorage.save(file);
            const photo = await this.prisma.constructionOpportunityPhoto.create({
                data: {
                    constructionOpportunityId: id,
                    ...stored,
                    isPrimary: opportunity.photos.length === 0 && createdPhotos.length === 0,
                },
            });
            createdPhotos.push(photo);
            await this.prisma.constructionOpportunityHistory.create({
                data: {
                    constructionOpportunityId: id,
                    action: "PHOTO_ADDED",
                    description: `Photo added: ${photo.originalName}`,
                    newValue: photo.id,
                },
            });
        }
        return createdPhotos;
    }
    async deletePhoto(id, photoId) {
        const photo = await this.prisma.constructionOpportunityPhoto.findFirst({
            where: { id: photoId, constructionOpportunityId: id },
        });
        if (!photo)
            throw new AppError("Photo not found", 404);
        await this.fileStorage.delete(photo.relativePath);
        await this.prisma.constructionOpportunityPhoto.delete({ where: { id: photoId } });
        if (photo.isPrimary) {
            const nextPhoto = await this.prisma.constructionOpportunityPhoto.findFirst({
                where: { constructionOpportunityId: id },
                orderBy: { createdAt: "asc" },
            });
            if (nextPhoto) {
                await this.prisma.constructionOpportunityPhoto.update({
                    where: { id: nextPhoto.id },
                    data: { isPrimary: true },
                });
            }
        }
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "PHOTO_DELETED",
                description: `Photo removed: ${photo.originalName}`,
                previousValue: photoId,
            },
        });
    }
    async setPrimaryPhoto(id, photoId) {
        const photo = await this.prisma.constructionOpportunityPhoto.findFirst({
            where: { id: photoId, constructionOpportunityId: id },
        });
        if (!photo)
            throw new AppError("Photo not found", 404);
        await this.prisma.$transaction([
            this.prisma.constructionOpportunityPhoto.updateMany({
                where: { constructionOpportunityId: id },
                data: { isPrimary: false },
            }),
            this.prisma.constructionOpportunityPhoto.update({
                where: { id: photoId },
                data: { isPrimary: true },
            }),
        ]);
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "PRIMARY_PHOTO_CHANGED",
                newValue: photoId,
            },
        });
    }
    async updateStatus(id, status, reason) {
        const current = await this.getById(id);
        await this.prisma.constructionOpportunity.update({
            where: { id },
            data: { status },
        });
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "STATUS_CHANGED",
                previousValue: current.status,
                newValue: status,
                description: reason,
            },
        });
    }
    async history(id) {
        await this.getById(id);
        return this.prisma.constructionOpportunityHistory.findMany({
            where: { constructionOpportunityId: id },
            orderBy: { createdAt: "desc" },
        });
    }
    async exportById(id) {
        const entity = await this.getById(id);
        return ConstructionOpportunityExportMapper.toExportPayload(entity);
    }
    async sendToCrm(id) {
        const payload = await this.exportById(id);
        await this.prisma.constructionOpportunity.update({
            where: { id },
            data: { crmIntegrationStatus: "PENDING", crmLastAttemptAt: new Date() },
        });
        const result = await this.crmIntegrationService.sendConstructionOpportunity(payload);
        await this.prisma.constructionOpportunity.update({
            where: { id },
            data: {
                crmIntegrationStatus: result.success ? "SENT" : "ERROR",
                crmExternalId: result.externalId,
                crmIntegrationMessage: result.message,
            },
        });
        await this.prisma.constructionOpportunityHistory.create({
            data: {
                constructionOpportunityId: id,
                action: "CRM_INTEGRATION_ATTEMPT",
                newValue: JSON.stringify(result),
                description: result.message,
            },
        });
        return result;
    }
    async dashboard(includeTests = false) {
        const funnelStages = [
            "CAPTURED",
            "UNDER_REVIEW",
            "SENT_TO_PROSPECTING",
            "PROSPECTING",
            "CONVERTED",
        ];
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const testFilter = includeTests ? {} : { isTest: false };
        const [total, last30, highPotential, notEvaluated, overdueNextAction, notSentToCrm, latest, groupedStatus,] = await Promise.all([
            this.prisma.constructionOpportunity.count({ where: { isDeleted: false, ...testFilter } }),
            this.prisma.constructionOpportunity.count({
                where: { isDeleted: false, capturedAt: { gte: thirtyDaysAgo }, ...testFilter },
            }),
            this.prisma.constructionOpportunity.count({
                where: { isDeleted: false, commercialPotential: "HIGH", ...testFilter },
            }),
            this.prisma.constructionOpportunity.count({
                where: { isDeleted: false, commercialPotential: "NOT_EVALUATED", ...testFilter },
            }),
            this.prisma.constructionOpportunity.count({
                where: {
                    isDeleted: false,
                    nextActionDate: { lt: now },
                    status: { notIn: ["CONVERTED", "DISCARDED"] },
                    ...testFilter,
                },
            }),
            this.prisma.constructionOpportunity.count({
                where: {
                    isDeleted: false,
                    crmIntegrationStatus: { in: ["NOT_SENT", "ERROR"] },
                    ...testFilter,
                },
            }),
            this.prisma.constructionOpportunity.findMany({
                where: { isDeleted: false, ...testFilter },
                take: 8,
                orderBy: { capturedAt: "desc" },
                include: { photos: true },
            }),
            this.prisma.constructionOpportunity.groupBy({
                by: ["status"],
                where: { isDeleted: false, ...testFilter },
                _count: true,
            }),
        ]);
        const statusCounts = groupedStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {});
        const funnelTotal = funnelStages.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);
        return {
            total,
            last30,
            highPotential,
            notEvaluated,
            overdueNextAction,
            notSentToCrm,
            statusCounts,
            funnelTotal,
            latest,
        };
    }
}
