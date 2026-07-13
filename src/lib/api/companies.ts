/** Typed API functions for the Company resource and its employee assignments
 * (all require authentication). */

import { apiClient } from "@/lib/api/client";
import type { CompanyMembership } from "@/types/company-membership";
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

  listEmployees: (token: string, companyId: string) =>
    apiClient.get<CompanyMembership[]>(`/companies/${companyId}/employees`, {
      cache: "no-store",
      headers: authHeaders(token),
    }),

  addEmployee: (token: string, companyId: string, userId: string) =>
    apiClient.post<CompanyMembership>(
      `/companies/${companyId}/employees`,
      { user_id: userId },
      { headers: authHeaders(token) },
    ),

  removeEmployee: (token: string, companyId: string, userId: string) =>
    apiClient.delete<{ message: string }>(`/companies/${companyId}/employees/${userId}`, {
      headers: authHeaders(token),
    }),
};
