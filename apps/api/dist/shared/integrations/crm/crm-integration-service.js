import { randomUUID } from "node:crypto";
export class MockCrmIntegrationService {
    async sendConstructionOpportunity(_opportunity) {
        return {
            success: true,
            externalId: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
            message: "Mock CRM integration completed",
        };
    }
}
