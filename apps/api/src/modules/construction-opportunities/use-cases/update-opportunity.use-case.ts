import { AppError } from "../../../shared/errors/app-error.js";
import type {
  ConstructionOpportunityModel,
  UpdateOpportunityInput,
} from "../domain/models/construction-opportunity.model.js";
import type { ConstructionOpportunityUpdateInput } from "../schemas/construction-opportunity.schemas.js";
import type { IConstructionOpportunityRepository } from "../repositories/construction-opportunity.repository.interface.js";

const toDate = (value?: string | Date): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
};

const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, "");
};

export class UpdateOpportunityUseCase {
  constructor(private readonly repository: IConstructionOpportunityRepository) {}

  async execute(
    id: string,
    input: ConstructionOpportunityUpdateInput,
  ): Promise<ConstructionOpportunityModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError("Oportunidade não encontrada", 404);
    }

    const updateInput: UpdateOpportunityInput = {
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
      contactPhone: input.contactPhone ? normalizePhone(input.contactPhone) : undefined,
      contactEmail: input.contactEmail,
      nextAction: input.nextAction,
      nextActionDate: toDate(input.nextActionDate),
      notes: input.notes,
      tags: input.tags,
      capturedAt: toDate(input.capturedAt),
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.updatedByUserId,
      isTest: input.isTest,
    };

    return this.repository.update(id, updateInput);
  }
}
