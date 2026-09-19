import { api } from "./client";
import type { DashboardResponse } from "../../types/dashboard";

/** GET /api/admin/dashboard/summary — single pre-aggregated admin dashboard summary. */
export function getDashboardSummary(range: 7 | 30 | 90, signal?: AbortSignal): Promise<DashboardResponse> {
  return api.get<DashboardResponse>("/api/admin/dashboard/summary", { query: { range }, signal });
}
