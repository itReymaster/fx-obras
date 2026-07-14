import { env } from "../../../config/env.js";
import type { ConstructionOpportunityModel, CreateOpportunityRecord } from "../domain/models/construction-opportunity.model.js";
import type { ConstructionOpportunityCreateInput } from "../schemas/construction-opportunity.schemas.js";
import type { IConstructionOpportunityRepository } from "../repositories/construction-opportunity.repository.interface.js";

const toDate = (value?: string | Date): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
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

const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, "");
};

export class CreateOpportunityUseCase {
  constructor(private readonly repository: IConstructionOpportunityRepository) {}

  async execute(input: ConstructionOpportunityCreateInput): Promise<ConstructionOpportunityModel> {
    const code = await this.generateCode();

    const createInput: CreateOpportunityRecord = {
      code,
      title: input.title || generateFallbackTitle(input),
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
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      locationAccuracy: input.locationAccuracy,
      locationCapturedAt: toDate(input.locationCapturedAt),
      constructionCompany: input.constructionCompany,
      estimatedCompletionDate: toDate(input.estimatedCompletionDate),
      contactName: input.contactName,
      contactCompany: input.contactCompany,
      contactRole: input.contactRole,
      contactPhone: normalizePhone(input.contactPhone),
      contactEmail: input.contactEmail,
      nextAction: input.nextAction,
      nextActionDate: toDate(input.nextActionDate),
      notes: input.notes,
      tags: input.tags || [],
      capturedAt: toDate(input.capturedAt) || new Date(),
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.updatedByUserId,
      isTest: input.isTest ?? false,
    };

    return this.repository.create(createInput);
  }

  private async generateCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.repository.countByYear(currentYear);
    const seq = String(countThisYear + 1).padStart(6, "0");
    return `${env.appCodePrefix}-${currentYear}-${seq}`;
  }
}
