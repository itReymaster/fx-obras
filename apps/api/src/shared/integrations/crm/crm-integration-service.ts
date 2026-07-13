import { randomUUID } from "node:crypto";

export interface CrmIntegrationResult {
  success: boolean;
  externalId?: string;
  message: string;
}

export interface CrmIntegrationService<TPayload> {
  sendConstructionOpportunity(opportunity: TPayload): Promise<CrmIntegrationResult>;
}

export class MockCrmIntegrationService<TPayload> implements CrmIntegrationService<TPayload> {
  async sendConstructionOpportunity(_opportunity: TPayload): Promise<CrmIntegrationResult> {
    return {
      success: true,
      externalId: `MOCK-${randomUUID().slice(0, 8).toUpperCase()}`,
      message: "Mock CRM integration completed",
    };
  }
}
