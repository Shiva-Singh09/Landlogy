import { api } from "./client";
import type { AnalyticsResponse } from "../../types/analytics";

/**
 * GET /api/admin/analytics?range=7|30|90 — range-complete admin analytics.
 * Every figure is aggregated in PostgreSQL (GROUP BY / FILTER) for the full
 * selected window — no client-side sampling or pagination loops.
 */
export function getAnalytics(range: 7 | 30 | 90, signal?: AbortSignal): Promise<AnalyticsResponse> {
  return api.get<AnalyticsResponse>("/api/admin/analytics", { query: { range }, signal });
}
