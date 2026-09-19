/**
 * Enquiry types mirroring the admin backend contract
 * (`controllers/admin/adminEnquiryController.js`, `models/enquiry.js`).
 *
 * Note: the `converted_user_id` / `converted_property_id` linkage columns
 * exist in the database but the list/detail endpoints do not serialize them,
 * so they are deliberately absent here — do not assume them present.
 */

import type { ApiResponse, PaginatedQuery, Pagination } from "./api";

/** Enquiry statuses from `utils/constants.js` / the `enquiries.status` ENUM. */
export type EnquiryStatus = "new" | "reviewed" | "converted" | "rejected";

/** Item of `GET /api/admin/enquiries` (exact attribute list; `message` excluded). */
export interface EnquiryListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  intent: string | null;
  property_type: string | null;
  status: EnquiryStatus;
  reviewed_by: string | null;
  notes: string | null;
  rejection_remark: string | null;
  created_at: string;
  updated_at: string;
}

/** `GET /api/admin/enquiries/:id` — list fields plus the full `message`. */
export interface Enquiry extends EnquiryListItem {
  message: string | null;
}

/** Query params accepted by `GET /api/admin/enquiries` (sorting is fixed to `created_at DESC`). */
export interface EnquiryListQuery extends PaginatedQuery {
  status?: EnquiryStatus;
  search?: string;
}

export type EnquiryListResponse = ApiResponse<{
  enquiries: EnquiryListItem[];
  pagination: Pagination;
}>;

export type EnquiryDetailResponse = ApiResponse<{
  enquiry: Enquiry;
}>;

export interface UpdateEnquiryStatusRequest {
  status: EnquiryStatus;
  notes?: string;
  rejection_remark?: string;
}

export type UpdateEnquiryStatusResponse = ApiResponse<{
  enquiry: Pick<Enquiry, "id" | "status"> & Partial<Enquiry>;
  seller?: { id: string; email: string };
  property?: { id: string; status: string };
  onboarding?: { email_sent: boolean; note?: string; email_error?: string; repeated?: boolean };
  idempotent?: boolean;
}>;
