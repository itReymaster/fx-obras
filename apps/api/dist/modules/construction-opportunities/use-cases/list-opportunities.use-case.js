export class ListOpportunitiesUseCase {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(query) {
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
