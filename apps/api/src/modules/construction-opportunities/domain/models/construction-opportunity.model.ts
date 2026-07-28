/**
 * Entity Model - Modelo de domínio independente de framework/banco de dados
 */
export interface ConstructionOpportunityModel {
  id: string;
  code: string;
  title: string;
  description?: string;
  constructionType?: string;
  constructionStage?: string;
  commercialPotential?: string;
  status: string;
  addressSource?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  withoutNumber?: boolean;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  locationCapturedAt?: Date;
  constructionCompany?: string;
  estimatedCompletionDate?: Date;
  contactName?: string;
  contactCompany?: string;
  contactRole?: string;
  contactPhone?: string;
  contactEmail?: string;
  nextAction?: string;
  nextActionDate?: Date;
  notes?: string;
  tags: string[];
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId?: string;
  updatedByUserId?: string;
  crmIntegrationStatus: string;
  crmIntegrationError?: string;
  crmIntegrationTimestamp?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isTest: boolean;
  photos: Array<{
    id: string;
    originalName: string;
    relativePath: string;
    thumbnailRelativePath?: string;
    mimeType: string;
    isPrimary: boolean;
  }>;
  history?: Array<{ id: string; action: string; description?: string; createdAt: Date }>;
}

export interface CreateOpportunityInput
  extends Omit<
    ConstructionOpportunityModel,
    | "id"
    | "code"
    | "createdAt"
    | "updatedAt"
    | "crmIntegrationStatus"
    | "crmIntegrationError"
    | "crmIntegrationTimestamp"
    | "isDeleted"
    | "deletedAt"
    | "photos"
    | "history"
  > {}

/** Payload persistido pelo repositório (inclui código gerado pelo use case). */
export type CreateOpportunityRecord = CreateOpportunityInput & {
  code: string;
};

export interface UpdateOpportunityInput extends Partial<CreateOpportunityInput> {}
