/** Typed API functions for the Team resource and its membership assignments
 * (all require authentication). */

import { apiClient } from "@/lib/api/client";
import type { Membership } from "@/types/membership";
import type { Page, Team, TeamCreate, TeamUpdate } from "@/types/team";

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const teamsApi = {
  list: (
    token: string,
    params?: { companyId?: string; limit?: number; offset?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.companyId) query.set("company_id", params.companyId);
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<Team>>(`/teams${suffix}`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
  },

  get: (token: string, id: string) =>
    apiClient.get<Team>(`/teams/${id}`, { cache: "no-store", headers: authHeaders(token) }),

  create: (token: string, payload: TeamCreate) =>
    apiClient.post<Team>("/teams", payload, { headers: authHeaders(token) }),

  update: (token: string, id: string, payload: TeamUpdate) =>
    apiClient.patch<Team>(`/teams/${id}`, payload, { headers: authHeaders(token) }),

  remove: (token: string, id: string) =>
    apiClient.delete<{ message: string }>(`/teams/${id}`, { headers: authHeaders(token) }),

  listMembers: (token: string, teamId: string) =>
    apiClient.get<Membership[]>(`/teams/${teamId}/members`, {
      cache: "no-store",
      headers: authHeaders(token),
    }),

  addMember: (token: string, teamId: string, userId: string) =>
    apiClient.post<Membership>(
      `/teams/${teamId}/members`,
      { user_id: userId },
      { headers: authHeaders(token) },
    ),

  removeMember: (token: string, teamId: string, userId: string) =>
    apiClient.delete<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
      headers: authHeaders(token),
    }),
};
