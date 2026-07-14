import { AppError } from "../../../shared/errors/app-error.js";
const toDate = (value) => {
    if (!value)
        return undefined;
    return value instanceof Date ? value : new Date(value);
};
const normalizePhone = (phone) => {
    if (!phone)
        return undefined;
    return phone.replace(/[^\d+]/g, "");
};
export class UpdateOpportunityUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(id, input) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new AppError("Oportunidade não encontrada", 404);
        }
        const updateInput = {
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
