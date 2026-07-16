/** Typed API for cross-team task views (the "My Tasks" page). Team-scoped task
 *  operations live on `teamsApi`; this is only the assigned-across-teams list. */

import { apiClient } from "@/lib/api/client";
import type { Page } from "@/types/team";
import type { Task, TaskListParams } from "@/types/task";

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

export const tasksApi = {
  /** Tasks assigned to the current user across every team they belong to.
   *  `assigneeId` is ignored — the backend always scopes to the caller. */
  listAssigned: (token: string, params?: TaskListParams) => {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status) query.set("status", params.status);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.category) query.set("category", params.category);
    if (params?.dueFrom) query.set("due_from", params.dueFrom);
    if (params?.dueTo) query.set("due_to", params.dueTo);
    if (params?.dueUnset) query.set("due_unset", "true");
    if (params?.overdue) query.set("overdue", "true");
    if (params?.sort) query.set("sort", params.sort);
    if (params?.limit != null) query.set("limit", String(params.limit));
    if (params?.offset != null) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<Page<Task>>(`/tasks/assigned${suffix}`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
  },
};
