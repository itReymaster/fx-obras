import { api } from "../../../services/api";
import type { Opportunity, OpportunityListResponse } from "../types/opportunity.types";

export const opportunitiesApi = {
  async dashboard() {
    const { data } = await api.get("/construction-opportunities/dashboard");
    return data;
  },

  async count() {
    const { data } = await api.get<OpportunityListResponse>("/construction-opportunities", {
      params: { page: 1, pageSize: 1 },
    });
    return data.pagination.totalItems;
  },

  async list(params: Record<string, unknown>) {
    const { data } = await api.get<OpportunityListResponse>("/construction-opportunities", {
      params,
    });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get<Opportunity>(`/construction-opportunities/${id}`);
    return data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<Opportunity>("/construction-opportunities", payload);
    return data;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put<Opportunity>(`/construction-opportunities/${id}`, payload);
    return data;
  },

  async uploadPhotos(id: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));
    const { data } = await api.post(`/construction-opportunities/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as Array<{ id: string }>;
  },

  async setPrimaryPhoto(id: string, photoId: string) {
    await api.patch(`/construction-opportunities/${id}/photos/${photoId}/primary`);
  },

  async deletePhoto(id: string, photoId: string) {
    await api.delete(`/construction-opportunities/${id}/photos/${photoId}`);
  },

  async remove(id: string) {
    await api.delete(`/construction-opportunities/${id}`);
  },

  async updateStatus(id: string, status: string, reason?: string) {
    await api.patch(`/construction-opportunities/${id}/status`, { status, reason });
  },
};
