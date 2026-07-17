export type OpportunityStatus =
  | "DRAFT"
  | "CAPTURED"
  | "UNDER_REVIEW"
  | "SENT_TO_PROSPECTING"
  | "PROSPECTING"
  | "CONVERTED"
  | "DISCARDED";

export interface OpportunityPhoto {
  id: string;
  originalName: string;
  relativePath: string;
  mimeType: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface OpportunityAudio {
  id: string;
  originalName: string;
  relativePath: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  code: string;
  title: string;
  constructionType: string;
  constructionStage: string;
  commercialPotential: string;
  status: OpportunityStatus;
  addressSource: "GPS" | "MANUAL";
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  locationCapturedAt?: string | null;
  notes?: string | null;
  tags: string[];
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  crmIntegrationStatus: "NOT_SENT" | "PENDING" | "SENT" | "ERROR";
  capturedAt: string;
  photos: OpportunityPhoto[];
  isTest: boolean;
}

export interface OpportunityListResponse {
  data: Opportunity[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
