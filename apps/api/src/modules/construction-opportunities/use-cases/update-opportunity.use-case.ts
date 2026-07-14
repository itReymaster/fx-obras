import { AppError } from "../../../shared/errors/app-error.js";
import type { ConstructionOpportunityModel, UpdateOpportunityInput } from "../../domain/models/construction-opportunity.model.js";
import type { IConstructionOpportunityRepository } from "../../repositories/construction-opportunity.repository.interface.js";

const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, "");
};

export class UpdateOpportunityUseCase {
  constructor(private readonly repository: IConstructionOpportunityRepository) {}

  async execute(id: string, input: UpdateOpportunityInput): Promise<ConstructionOpportunityModel> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError("Oportunidade não encontrada", 404);
    }

    const updateInput: UpdateOpportunityInput = {
      ...input,
      contactPhone: input.contactPhone ? normalizePhone(input.contactPhone) : undefined,
    };

    const updated = await this.repository.update(id, updateInput);
    return updated;
  }
}
