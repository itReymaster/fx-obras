import { AppError } from "../../../shared/errors/app-error.js";
export class GetOpportunityByIdUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id) {
        const opportunity = await this.repository.findById(id);
        if (!opportunity) {
            throw new AppError("Oportunidade não encontrada", 404);
        }
        return opportunity;
    }
}
