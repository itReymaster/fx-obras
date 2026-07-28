export interface ServiceProvider {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityProviderLink {
  id: string;
  role?: string | null;
  createdAt: string;
  provider: ServiceProvider;
}

export interface ProviderOpportunityLink {
  id: string;
  role?: string | null;
  createdAt: string;
  opportunity: {
    id: string;
    code: string;
    title: string;
    city: string | null;
    status: string;
  };
}
