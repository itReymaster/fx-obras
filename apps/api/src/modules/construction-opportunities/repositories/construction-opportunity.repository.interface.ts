import type {
  ConstructionOpportunityModel,
  CreateOpportunityInput,
  UpdateOpportunityInput,
} from "../domain/models/construction-opportunity.model.js";
import type { ListQueryInput } from "../schemas/construction-opportunity.schemas.js";

export interface IConstructionOpportunityRepository {
  findById(id: string): Promise<ConstructionOpportunityModel | null>;
  findAll(query: ListQueryInput): Promise<{
    data: ConstructionOpportunityModel[];
    totalItems: number;
  }>;
  findByCode(code: string): Promise<ConstructionOpportunityModel | null>;
  create(input: CreateOpportunityInput): Promise<ConstructionOpportunityModel>;
  update(id: string, input: UpdateOpportunityInput): Promise<ConstructionOpportunityModel>;
  delete(id: string): Promise<void>;
  count(filters?: Partial<ConstructionOpportunityModel>): Promise<number>;
  countByYear(year: number): Promise<number>;
  aggregateByStatus(): Promise<Array<{ status: string; count: number }>>;
}
