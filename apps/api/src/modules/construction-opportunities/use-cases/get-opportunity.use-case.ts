import { AppError } from "../../../shared/errors/app-error.js";
import type { ConstructionOpportunityModel } from "../../domain/models/construction-opportunity.model.js";
import type { IConstructionOpportunityRepository } from "../../repositories/construction-opportunity.repository.interface.js";

export class GetOpportunityByIdUseCase {
  constructor(private readonly repository: IConstructionOpportunityRepository) {}

  async execute(id: string): Promise<ConstructionOpportunityModel> {
    const opportunity = await this.repository.findById(id);

    if (!opportunity) {
      throw new AppError("Oportunidade não encontrada", 404);
    }

    return opportunity;
  }
}
