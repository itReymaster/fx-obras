import type { ConstructionOpportunityModel } from "../../domain/models/construction-opportunity.model.js";
import type { ListQueryInput } from "../../schemas/construction-opportunity.schemas.js";
import type { IConstructionOpportunityRepository } from "../../repositories/construction-opportunity.repository.interface.js";

export class ListOpportunitiesUseCase {
  constructor(private readonly repository: IConstructionOpportunityRepository) {}

  async execute(query: ListQueryInput): Promise<{
    data: ConstructionOpportunityModel[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }> {
    const { data, totalItems } = await this.repository.findAll(query);

    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  }
}
