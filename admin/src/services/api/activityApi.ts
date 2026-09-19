import { api } from "./client";
import type { ActivityListQuery, ActivityListResponse } from "../../types/activity";

/** GET /api/admin/activity — recent activity feed (newest first). */
export function listActivity(
  query: ActivityListQuery = {},
  signal?: AbortSignal,
): Promise<ActivityListResponse> {
  return api.get<ActivityListResponse>("/api/admin/activity", { query, signal });
}
