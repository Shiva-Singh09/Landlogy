/**
 * Activity types mirroring the admin backend contract
 * (`controllers/admin/adminActivityController.js` — `GET /api/admin/activity`).
 *
 * Notes:
 * - `actor` is null when the acting user was deleted or the action is
 *   system-generated — the UI shows "System" in that case.
 * - `entity.id` is an internal UUID; it is never rendered in the UI.
 */

import type { ApiResponse, Pagination, UserRole } from "./api";

/** Acting user behind an activity record (absent for system/deleted actors). */
export interface ActivityActor {
  id: string;
  name: string;
  role: UserRole;
}

/** The record an activity entry refers to. */
export interface ActivityEntity {
  type: string;
  id: string;
}

/** Item of `GET /api/admin/activity` (newest first). */
export interface ActivityItem {
  id: string;
  type: string;
  action: string;
  description: string;
  actor: ActivityActor | null;
  entity: ActivityEntity;
  created_at: string;
}

/**
 * Query params used by the Dashboard — recent feed only (`limit`, default 5).
 * The backend also supports `entity_type`/`action`/`search`/date filters,
 * deliberately not exposed here until a page needs them.
 */
export interface ActivityListQuery {
  page?: number;
  limit?: number;
  entity_type?: "property" | "enquiry" | "client";
  action?: ActivityItem["action"];
  search?: string;
  start_date?: string;
  end_date?: string;
}

export type ActivityListResponse = ApiResponse<{
  activities: ActivityItem[];
  pagination: Pagination;
}>;
