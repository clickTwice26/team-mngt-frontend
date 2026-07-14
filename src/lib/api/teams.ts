/** Typed API functions for the Team resource and its membership assignments
 * (all require authentication). */

import { apiClient } from "@/lib/api/client";
import type { Membership, WorkArrangement } from "@/types/membership";
import type { Page, Team, TeamCreate, TeamUpdate } from "@/types/team";
import type { Task, TaskAttachment, TaskCreate, TaskUpdate } from "@/types/task";
import type { TaskComment, TaskCommentCreate } from "@/types/task-comment";
import type { WorkLogCreate, WorkLogEntry, WorkLogUpdate } from "@/types/work-log";

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

  /** Set a member's working method. Platform developers only. */
  setMemberWork: (
    token: string,
    teamId: string,
    userId: string,
    payload: WorkArrangement,
  ) =>
    apiClient.put<Membership>(`/teams/${teamId}/members/${userId}/work`, payload, {
      headers: authHeaders(token),
    }),

  listTasks: (token: string, teamId: string) =>
    apiClient.get<Task[]>(`/teams/${teamId}/tasks`, {
      cache: "no-store",
      headers: authHeaders(token),
    }),

  createTask: (token: string, teamId: string, payload: TaskCreate) =>
    apiClient.post<Task>(`/teams/${teamId}/tasks`, payload, { headers: authHeaders(token) }),

  updateTask: (token: string, teamId: string, taskId: string, payload: TaskUpdate) =>
    apiClient.patch<Task>(`/teams/${teamId}/tasks/${taskId}`, payload, {
      headers: authHeaders(token),
    }),

  removeTask: (token: string, teamId: string, taskId: string) =>
    apiClient.delete<{ message: string }>(`/teams/${teamId}/tasks/${taskId}`, {
      headers: authHeaders(token),
    }),

  uploadTaskAttachment: (token: string, teamId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<TaskAttachment>(`/teams/${teamId}/tasks/attachments`, formData, {
      headers: authHeaders(token),
    });
  },

  // --- Work log (hourly members only) ---

  uploadWorkLogAttachment: (token: string, teamId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<TaskAttachment>(`/teams/${teamId}/work-logs/attachments`, formData, {
      headers: authHeaders(token),
    });
  },

  listWorkLogs: (token: string, teamId: string, userId?: string) => {
    const suffix = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return apiClient.get<WorkLogEntry[]>(`/teams/${teamId}/work-logs${suffix}`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
  },

  createWorkLog: (token: string, teamId: string, payload: WorkLogCreate) =>
    apiClient.post<WorkLogEntry>(`/teams/${teamId}/work-logs`, payload, {
      headers: authHeaders(token),
    }),

  updateWorkLog: (token: string, teamId: string, entryId: string, payload: WorkLogUpdate) =>
    apiClient.patch<WorkLogEntry>(`/teams/${teamId}/work-logs/${entryId}`, payload, {
      headers: authHeaders(token),
    }),

  removeWorkLog: (token: string, teamId: string, entryId: string) =>
    apiClient.delete<{ message: string }>(`/teams/${teamId}/work-logs/${entryId}`, {
      headers: authHeaders(token),
    }),

  // --- Task discussion (submitter + assignees only) ---

  listTaskComments: (token: string, teamId: string, taskId: string) =>
    apiClient.get<TaskComment[]>(`/teams/${teamId}/tasks/${taskId}/comments`, {
      cache: "no-store",
      headers: authHeaders(token),
    }),

  createTaskComment: (
    token: string,
    teamId: string,
    taskId: string,
    payload: TaskCommentCreate,
  ) =>
    apiClient.post<TaskComment>(`/teams/${teamId}/tasks/${taskId}/comments`, payload, {
      headers: authHeaders(token),
    }),

  removeTaskComment: (token: string, teamId: string, taskId: string, commentId: string) =>
    apiClient.delete<{ message: string }>(
      `/teams/${teamId}/tasks/${taskId}/comments/${commentId}`,
      { headers: authHeaders(token) },
    ),
};
