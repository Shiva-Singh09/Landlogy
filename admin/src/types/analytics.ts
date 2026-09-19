/**
 * Types mirroring the backend contract for
 * `GET /api/admin/analytics?range=7|30|90`
 * (controllers/admin/adminAnalyticsController.js) — range-complete analytics
 * aggregated directly in PostgreSQL for the selected 7/30/90-day window.
 *
 * Convention: `in_range` / `*_range` figures only include records created
 * within the selected window; `lifetime` / `*_lifetime` figures are
 * current-state totals across all time. The UI labels each explicitly.
 */

import type { ApiResponse } from "./api";
import type { PropertyStatus } from "./property";
import type { EnquiryStatus } from "./enquiry";

/** One labelled aggregate row (e.g. a city, type or price band). */
export interface DistributionRow {
  label: string;
  count: number;
}

/** A status count split into the selected range and lifetime totals. */
export interface StatusSplit {
  in_range: number;
  lifetime: number;
}

/** Asking-price aggregation for the selected range. */
export interface PriceAggregates {
  with_price: number;
  without_price: number;
  average: number | null;
  bands: DistributionRow[];
}

/** Property analytics for the selected range + lifetime pipeline. */
export interface PropertyAnalytics {
  total_range: number;
  total_lifetime: number;
  byStatus: Record<PropertyStatus, StatusSplit>;
  type_distribution: DistributionRow[];
  category_distribution: DistributionRow[];
  city_distribution: DistributionRow[];
  distinct_cities: number;
  price: PriceAggregates;
  price_by_type: Array<DistributionRow & { average: number | null }>;
  listing_age: {
    buckets: DistributionRow[];
    total: number;
  };
}

/** Enquiry analytics for the selected range + lifetime funnel. */
export interface EnquiryAnalytics {
  total_range: number;
  total_lifetime: number;
  byStatus: Record<EnquiryStatus, StatusSplit>;
  conversion_rate_range: number | null;
  conversion_rate_lifetime: number | null;
  rejection_rate_range: number | null;
  rejection_rate_lifetime: number | null;
  ageing: {
    buckets: DistributionRow[];
    unresolved_total: number;
    average_handling_days: number | null;
    handled_count: number;
  };
}

/** Complete `analytics` block returned by `GET /api/admin/analytics`. */
export interface AdminAnalytics {
  range: 7 | 30 | 90;
  properties: PropertyAnalytics;
  enquiries: EnquiryAnalytics;
}

/** Envelope for `GET /api/admin/analytics`. */
export type AnalyticsResponse = ApiResponse<{ analytics: AdminAnalytics }>;
