import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  MockCrmIntegrationService,
  type CrmIntegrationService,
} from "../../../shared/integrations/crm/crm-integration-service.js";
import {
  LocalFileStorageService,
  type FileStorageService,
  type UploadedFile,
} from "../../../shared/storage/file-storage-service.js";
import { ConstructionOpportunityExportMapper } from "../mappers/construction-opportunity-export.mapper.js";
import type {
  ConstructionOpportunityCreateInput,
  ConstructionOpportunityUpdateInput,
  ListQueryInput,
} from "../schemas/construction-opportunity.schemas.js";

const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, "");
};

const generateFallbackTitle = (input: ConstructionOpportunityCreateInput): string => {
  if (input.street) {
    const suffix = input.number ? `, ${input.number}` : "";
    return `Obra - ${input.street}${suffix}`;
  }
  if (input.district && input.city) {
    return `Obra - ${input.district} - ${input.city}`;
  }
  return `Obra capturada em ${new Date().toLocaleDateString("pt-BR")}`;
};

const parseTags = (tags?: string) => {
  if (!tags) return [] as string[];
  try {
    return JSON.parse(tags) as string[];
  } catch {
    return [];
  }
};

export class ConstructionOpportunitiesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fileStorage: FileStorageService = new LocalFileStorageService(),
    private readonly crmIntegrationService: CrmIntegrationService<any> =
      new MockCrmIntegrationService(),
  ) {}

  private async nextCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const end = new Date(`${currentYear + 1}-01-01T00:00:00.000Z`);

    const countThisYear = await this.prisma.constructionOpportunity.count({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const seq = String(countThisYear + 1).padStart(6, "0");
    return `${env.appCodePrefix}-${currentYear}-${seq}`;
  }

  private buildCreateData(input: ConstructionOpportunityCreateInput): Prisma.ConstructionOpportunityCreateInput {
    return {
      code: randomUUID(),
      title: input.title || generateFallbackTitle(input),
      description: input.description,
      constructionType: input.constructionType,
      constructionStage: input.constructionStage,
      commercialPotential: input.commercialPotential,
      status: input.status ?? "CAPTURED",
      addressSource: input.addressSource,
      postalCode: input.postalCode,
      street: input.street,
      number: input.number,
      withoutNumber: input.withoutNumber,
      complement: input.complement,
      district: input.district,
      city: input.city,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      locationAccuracy: input.locationAccuracy,
      locationCapturedAt: input.locationCapturedAt ? new Date(input.locationCapturedAt) : undefined,
      constructionCompany: input.constructionCompany,
      estimatedCompletionDate: input.estimatedCompletionDate
        ? new Date(input.estimatedCompletionDate)
        : undefined,
      contactName: input.contactName,
      contactCompany: input.contactCompany,
      contactRole: input.contactRole,
      contactPhone: normalizePhone(input.contactPhone),
      contactEmail: input.contactEmail,
      nextAction: input.nextAction,
      nextActionDate: input.nextActionDate ? new Date(input.nextActionDate) : undefined,
      notes: input.notes,
      tags: JSON.stringify(input.tags),
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.updatedByUserId,
      crmIntegrationStatus: "NOT_SENT",
      isTest: input.isTest ?? false,
    };
  }

  async create(input: ConstructionOpportunityCreateInput) {
    const code = await this.nextCode();
    const created = await this.prisma.constructionOpportunity.create({
      data: {
        ...this.buildCreateData(input),
        code,
      },
      include: { photos: true, history: true },
    });

    await this.prisma.constructionOpportunityHistory.create({
      data: {
        constructionOpportunityId: created.id,
        action: "CREATED",
        description: "Opportunity created",
      },
    });

    return {
      ...created,
      tags: parseTags(created.tags ?? undefined),
    };
  }

  private buildWhere(query: ListQueryInput): Prisma.ConstructionOpportunityWhereInput {
    const andFilters: Prisma.ConstructionOpportunityWhereInput[] = [{ isDeleted: false }];

    if (query.search) {
      andFilters.push({
        OR: [
          { title: { contains: query.search } },
          { notes: { contains: query.search } },
          { code: { contains: query.search } },
        ],
      });
    }
    if (query.city) andFilters.push({ city: query.city });
    if (query.state) andFilters.push({ state: query.state.toUpperCase() });
    if (query.district) andFilters.push({ district: query.district });
    if (query.constructionType)
      andFilters.push({ constructionType: query.constructionType as any });
    if (query.constructionStage)
      andFilters.push({ constructionStage: query.constructionStage as any });
    if (query.status) andFilters.push({ status: query.status as any });
    if (query.commercialPotential)
      andFilters.push({ commercialPotential: query.commercialPotential as any });
    if (query.addressSource) andFilters.push({ addressSource: query.addressSource as any });
    if (query.hasContact !== undefined) {
      andFilters.push(
        query.hasContact
          ? { OR: [{ contactName: { not: null } }, { contactPhone: { not: null } }, { contactEmail: { not: null } }] }
          : { AND: [{ contactName: null }, { contactPhone: null }, { contactEmail: null }] },
      );
    }
    if (query.hasNextAction !== undefined) {
      andFilters.push(query.hasNextAction ? { nextAction: { not: null } } : { nextAction: null });
    }
    if (query.isTest !== undefined) {
      andFilters.push({ isTest: query.isTest });
    }

    return { AND: andFilters };
  }

  private sortBy(sortBy: ListQueryInput["sortBy"]): Prisma.ConstructionOpportunityOrderByWithRelationInput {
    if (sortBy === "oldest") return { capturedAt: "asc" };
    if (sortBy === "title") return { title: "asc" };
    if (sortBy === "city") return { city: "asc" };
    if (sortBy === "commercialPotential") return { commercialPotential: "desc" };
    if (sortBy === "nextActionDate") return { nextActionDate: "asc" };
    return { capturedAt: "desc" };
  }

  async list(query: ListQueryInput) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [items, totalItems] = await Promise.all([
      this.prisma.constructionOpportunity.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: this.sortBy(query.sortBy),
        include: { photos: true },
      }),
      this.prisma.constructionOpportunity.count({ where }),
    ]);

    return {
      data: items.map((item: any) => ({ ...item, tags: parseTags(item.tags ?? undefined) })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  async getById(id: string) {
    const opportunity = await this.prisma.constructionOpportunity.findFirst({
      where: { id, isDeleted: false },
      include: {
        photos: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!opportunity) throw new AppError("Opportunity not found", 404);

    return {
      ...opportunity,
      tags: parseTags(opportunity.tags ?? undefined),
    };
  }

  async update(id: string, input: ConstructionOpportunityUpdateInput) {
    await this.getById(id);

    const data: Prisma.ConstructionOpportunityUpdateInput = {
      ...input,
      state: input.state?.toUpperCase(),
      contactPhone: normalizePhone(input.contactPhone),
      tags: input.tags ? JSON.stringify(input.tags) : undefined,
      locationCapturedAt: input.locationCapturedAt ? new Date(input.locationCapturedAt) : undefined,
      estimatedCompletionDate: input.estimatedCompletionDate
        ? new Date(input.estimatedCompletionDate)
        : undefined,
      nextActionDate: input.nextActionDate ? new Date(input.nextActionDate) : undefined,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
    };

    const updated = await this.prisma.constructionOpportunity.update({
      where: { id },
      data,
      include: { photos: true, history: true },
    });

    await this.prisma.constructionOpportunityHistory.create({
      data: {
        constructionOpportunityId: id,
        action: "UPDATED",
        description: "Opportunity updated",
      },
    });

    return {
      ...updated,
      tags: parseTags(updated.tags ?? undefined),
    };
  }

  async softDelete(id: string) {
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

  async addPhotos(id: string, files: UploadedFile[]) {
    const opportunity = await this.getById(id);
    const currentCount = opportunity.photos.length;
    if (currentCount + files.length > env.maxPhotosPerOpportunity) {
      throw new AppError(
        `Photo limit exceeded. Max allowed: ${env.maxPhotosPerOpportunity}`,
        422,
      );
    }

    const createdPhotos: any[] = [];
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

  async deletePhoto(id: string, photoId: string) {
    const photo = await this.prisma.constructionOpportunityPhoto.findFirst({
      where: { id: photoId, constructionOpportunityId: id },
    });
    if (!photo) throw new AppError("Photo not found", 404);

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

  async setPrimaryPhoto(id: string, photoId: string) {
    const photo = await this.prisma.constructionOpportunityPhoto.findFirst({
      where: { id: photoId, constructionOpportunityId: id },
    });
    if (!photo) throw new AppError("Photo not found", 404);

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

  async updateStatus(id: string, status: string, reason?: string) {
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

  async history(id: string) {
    await this.getById(id);
    return this.prisma.constructionOpportunityHistory.findMany({
      where: { constructionOpportunityId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async exportById(id: string) {
    const entity = await this.getById(id);
    return ConstructionOpportunityExportMapper.toExportPayload(entity);
  }

  async sendToCrm(id: string) {
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
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const testFilter = includeTests ? {} : { isTest: false };

    const [
      total,
      last30,
      highPotential,
      notEvaluated,
      overdueNextAction,
      notSentToCrm,
      latest,
    ] = await Promise.all([
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
    ]);

    return {
      total,
      last30,
      highPotential,
      notEvaluated,
      overdueNextAction,
      notSentToCrm,
      latest,
    };
  }
}
