export interface ConstructionOpportunityPhoto {
  id: string;
  constructionOpportunityId: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  size: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ConstructionOpportunityHistory {
  id: string;
  constructionOpportunityId: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  description?: string;
  createdAt: string;
}
