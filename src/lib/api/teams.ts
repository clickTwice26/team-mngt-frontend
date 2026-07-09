/** Typed API functions for the Team resource. */

import { apiClient } from "@/lib/api/client";
import type { Page, Team, TeamCreate, TeamUpdate } from "@/types/team";

export const teamsApi = {
  list: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<Team>>(`/teams${suffix}`, { cache: "no-store" });
  },

  get: (id: string) => apiClient.get<Team>(`/teams/${id}`, { cache: "no-store" }),

  create: (payload: TeamCreate) => apiClient.post<Team>("/teams", payload),

  update: (id: string, payload: TeamUpdate) =>
    apiClient.patch<Team>(`/teams/${id}`, payload),

  remove: (id: string) => apiClient.delete<{ message: string }>(`/teams/${id}`),
};
