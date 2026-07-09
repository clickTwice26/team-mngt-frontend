/** Typed API functions for the Company resource (all require authentication). */

import { apiClient } from "@/lib/api/client";
import type { Company, CompanyCreate, CompanyUpdate } from "@/types/company";
import type { Page } from "@/types/team";

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const companiesApi = {
  list: (token: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<Company>>(`/companies${suffix}`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
  },

  get: (token: string, id: string) =>
    apiClient.get<Company>(`/companies/${id}`, {
      cache: "no-store",
      headers: authHeaders(token),
    }),

  create: (token: string, payload: CompanyCreate) =>
    apiClient.post<Company>("/companies", payload, { headers: authHeaders(token) }),

  update: (token: string, id: string, payload: CompanyUpdate) =>
    apiClient.patch<Company>(`/companies/${id}`, payload, { headers: authHeaders(token) }),

  remove: (token: string, id: string) =>
    apiClient.delete<{ message: string }>(`/companies/${id}`, {
      headers: authHeaders(token),
    }),
};
