import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { ConstructionOpportunityModel, CreateOpportunityInput } from "../../domain/models/construction-opportunity.model.js";
import type { IConstructionOpportunityRepository } from "../../repositories/construction-opportunity.repository.interface.js";

const generateFallbackTitle = (input: CreateOpportunityInput): string => {
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

  async execute(input: CreateOpportunityInput): Promise<ConstructionOpportunityModel> {
    const code = await this.generateCode();

    const createInput = {
      ...input,
      code,
      title: input.title || generateFallbackTitle(input),
      contactPhone: normalizePhone(input.contactPhone),
      tags: input.tags || [],
      capturedAt: input.capturedAt || new Date(),
    } as CreateOpportunityInput;

    const opportunity = await this.repository.create(createInput);

    return opportunity;
  }

  private async generateCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.repository.countByYear(currentYear);
    const seq = String(countThisYear + 1).padStart(6, "0");
    return `${env.appCodePrefix}-${currentYear}-${seq}`;
  }
}
