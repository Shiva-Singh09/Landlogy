/**
 * Dashboard types mirroring the admin backend contract
 * `GET /api/admin/dashboard/summary` — a single pre-aggregated summary.
 *
 * These are the ONLY shape assumptions the Dashboard makes about the endpoint.
 * No revenue / analytics / commission fields are modeled here (none exist).
 */

import type { ApiResponse } from "./api";
import type { PropertyStatus, PropertyListItem } from "./property";
import type { EnquiryStatus, EnquiryListItem } from "./enquiry";

/** Property counts returned under `summary.properties`. */
export interface DashboardPropertyStats {
  total: number;
  byStatus: Record<PropertyStatus, number>;
}

/** Enquiry counts returned under `summary.enquiries`. */
export interface DashboardEnquiryStats {
  total: number;
  byStatus: Record<EnquiryStatus, number>;
}

export interface DashboardTrendPoint {
  /** Calendar date in YYYY-MM-DD format, generated from real DB aggregates. */
  date: string;
  count: number;
}

export interface DashboardTrends {
  range: 7 | 30 | 90;
  properties: DashboardTrendPoint[];
  enquiries: DashboardTrendPoint[];
}

/**
 * A single recent-property item. Only the subset actually rendered by the
 * Dashboard is modeled — derived from `PropertyListItem` to stay in sync with
 * the list endpoint shape and avoid inventing fields.
 */
export type RecentProperty = Pick<
  PropertyListItem,
  "id" | "title" | "city" | "state" | "asking_price" | "status" | "created_at"
>;

/**
 * A single recent-enquiry item — the subset rendered on the Dashboard.
 */
export type RecentEnquiry = Pick<
  EnquiryListItem,
  | "id"
  | "name"
  | "phone"
  | "email"
  | "city"
  | "intent"
  | "property_type"
  | "status"
  | "created_at"
>;

/** Complete `summary` block returned by `GET /api/admin/dashboard/summary`. */
export interface DashboardSummary {
  properties: DashboardPropertyStats;
  enquiries: DashboardEnquiryStats;
  recent: {
    properties: RecentProperty[];
    enquiries: RecentEnquiry[];
  };
  trends: DashboardTrends;
}

/** Envelope for `GET /api/admin/dashboard/summary`. */
export type DashboardResponse = ApiResponse<{
  summary: DashboardSummary;
}>;
