import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { sendOpportunityNotification } from "../../../shared/email/email-service.js";
import { MockCrmIntegrationService, } from "../../../shared/integrations/crm/crm-integration-service.js";
import { LocalFileStorageService, } from "../../../shared/storage/file-storage-service.js";
import { ConstructionOpportunityExportMapper } from "../mappers/construction-opportunity-export.mapper.js";
import { CreateOpportunityUseCase, GetOpportunityByIdUseCase, ListOpportunitiesUseCase, UpdateOpportunityUseCase } from "../use-cases/index.js";
/**
 * V2 Service Layer - same contract, Sequelize-backed persistence for the main entity
 */
export class ConstructionOpportunitiesV2Service {
    repository;
    fileStorage;
    crmIntegrationService;
    createUseCase;
    updateUseCase;
    getUseCase;
    listUseCase;
    constructor(repository, fileStorage = new LocalFileStorageService(), crmIntegrationService = new MockCrmIntegrationService()) {
        this.repository = repository;
        this.fileStorage = fileStorage;
        this.crmIntegrationService = crmIntegrationService;
        this.createUseCase = new CreateOpportunityUseCase(this.repository);
        this.updateUseCase = new UpdateOpportunityUseCase(this.repository);
        this.getUseCase = new GetOpportunityByIdUseCase(this.repository);
        this.listUseCase = new ListOpportunitiesUseCase(this.repository);
    }
    async create(input) {
        const created = await this.createUseCase.execute(input);
        await this.repository.createHistory(created.id, {
            action: "CREATED",
            description: "Opportunity created",
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
        const history = await this.repository.findHistoryByOpportunityId(id);
        return {
            ...opportunity,
            tags: opportunity.tags,
            history,
        };
    }
    async update(id, input) {
        const updated = await this.updateUseCase.execute(id, input);
        await this.repository.createHistory(id, {
            action: "UPDATED",
            description: "Opportunity updated",
        });
        void sendOpportunityNotification("updated", updated);
        return {
            ...updated,
            tags: updated.tags,
        };
    }
    async softDelete(id) {
        await this.getById(id);
        await this.repository.delete(id);
        await this.repository.createHistory(id, {
            action: "DELETED",
            description: "Opportunity soft deleted",
        });
    }
    async addPhotos(id, files) {
        const opportunity = await this.getById(id);
        const currentPhotos = opportunity.photos ?? [];
        if (currentPhotos.length + files.length > env.maxPhotosPerOpportunity) {
            throw new AppError(`Photo limit exceeded. Max allowed: ${env.maxPhotosPerOpportunity}`, 422);
        }
        const createdPhotos = [];
        for (const file of files) {
            const stored = await this.fileStorage.save(file);
            const photo = await this.repository.createPhoto(id, {
                originalName: file.originalname,
                storedName: stored.storedName,
                relativePath: stored.relativePath,
                mimeType: file.mimetype,
                size: file.size,
                isPrimary: currentPhotos.length === 0 && createdPhotos.length === 0,
            });
            createdPhotos.push(photo);
            await this.repository.createHistory(id, {
                action: "PHOTO_ADDED",
                description: `Photo added: ${photo.originalName}`,
                newValue: photo.id,
            });
        }
        return createdPhotos;
    }
    async deletePhoto(id, photoId) {
        const photo = await this.repository.findPhotoById(id, photoId);
        if (!photo)
            throw new AppError("Photo not found", 404);
        await this.fileStorage.delete(photo.relativePath);
        await this.repository.deletePhoto(id, photoId);
        if (photo.isPrimary) {
            const remaining = await this.repository.findPhotosByOpportunityId(id);
            const nextPhoto = remaining.find((value) => value.id !== photoId);
            if (nextPhoto) {
                await this.repository.setPrimaryPhoto(id, nextPhoto.id);
            }
        }
        await this.repository.createHistory(id, {
            action: "PHOTO_DELETED",
            description: `Photo removed: ${photo.originalName}`,
            previousValue: photoId,
        });
    }
    async setPrimaryPhoto(id, photoId) {
        const photo = await this.repository.findPhotoById(id, photoId);
        if (!photo)
            throw new AppError("Photo not found", 404);
        await this.repository.setPrimaryPhoto(id, photoId);
        await this.repository.createHistory(id, {
            action: "PRIMARY_PHOTO_CHANGED",
            newValue: photoId,
        });
    }
    async updateStatus(id, status, reason) {
        const current = await this.getById(id);
        await this.repository.update(id, { status });
        await this.repository.createHistory(id, {
            action: "STATUS_CHANGED",
            previousValue: current.status,
            newValue: status,
            description: reason,
        });
    }
    async history(id) {
        await this.getById(id);
        return this.repository.findHistoryByOpportunityId(id);
    }
    async exportById(id) {
        const entity = await this.getById(id);
        return ConstructionOpportunityExportMapper.toExportPayload(entity);
    }
    async sendToCrm(id) {
        const payload = await this.exportById(id);
        await this.repository.update(id, {
            crmIntegrationStatus: "PENDING",
            crmLastAttemptAt: new Date(),
        });
        const result = await this.crmIntegrationService.sendConstructionOpportunity(payload);
        await this.repository.update(id, {
            crmIntegrationStatus: result.success ? "SENT" : "ERROR",
            crmExternalId: result.externalId,
            crmIntegrationMessage: result.message,
        });
        await this.repository.createHistory(id, {
            action: "CRM_INTEGRATION_ATTEMPT",
            newValue: JSON.stringify(result),
            description: result.message,
        });
        return result;
    }
    async dashboard(includeTests = false) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const testFilter = includeTests ? undefined : false;
        const [total, last30, highPotential, notEvaluated, overdueNextAction, notSentToCrm, latest, groupedStatus,] = await Promise.all([
            this.repository.count({ isTest: testFilter }),
            this.repository.countCreatedSince(thirtyDaysAgo, includeTests),
            this.repository.count({ isTest: testFilter, commercialPotential: "HIGH" }),
            this.repository.count({ isTest: testFilter, commercialPotential: "NOT_EVALUATED" }),
            this.repository.countOverdueNextAction(now, includeTests),
            this.repository.countNotSentToCrm(includeTests),
            this.repository.findLatest(includeTests),
            this.repository.aggregateByStatus(includeTests),
        ]);
        const statusCounts = groupedStatus.reduce((acc, item) => {
            acc[item.status] = item.count;
            return acc;
        }, {});
        const funnelStages = [
            "CAPTURED",
            "UNDER_REVIEW",
            "SENT_TO_PROSPECTING",
            "PROSPECTING",
            "CONVERTED",
        ];
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
