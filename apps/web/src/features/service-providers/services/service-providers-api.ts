import { api } from "../../../services/api";
import type {
  OpportunityProviderLink,
  ProviderOpportunityLink,
  ServiceProvider,
} from "../types/service-provider.types";

export const serviceProvidersApi = {
  async list(params?: { search?: string; type?: string }) {
    const { data } = await api.get<ServiceProvider[]>('/service-providers', { params });
    return data;
  },

  async create(payload: {
    name: string;
    type: string;
    phone?: string;
    email?: string;
    city?: string;
    notes?: string;
  }) {
    const { data } = await api.post<ServiceProvider>('/service-providers', payload);
    return data;
  },

  async listByOpportunity(opportunityId: string) {
    const { data } = await api.get<OpportunityProviderLink[]>(`/service-providers/opportunities/${opportunityId}`);
    return data;
  },

  async bindToOpportunity(opportunityId: string, providerIds: string[]) {
    const { data } = await api.put<OpportunityProviderLink[]>(`/service-providers/opportunities/${opportunityId}`, {
      providerIds,
    });
    return data;
  },

  async listOpportunitiesByProvider(providerId: string) {
    const { data } = await api.get<ProviderOpportunityLink[]>(`/service-providers/${providerId}/opportunities`);
    return data;
  },

  async bindOpportunitiesToProvider(providerId: string, opportunityIds: string[]) {
    const { data } = await api.put<ProviderOpportunityLink[]>(`/service-providers/${providerId}/opportunities`, {
      opportunityIds,
    });
    return data;
  },
};
