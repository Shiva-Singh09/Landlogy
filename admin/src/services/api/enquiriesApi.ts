import { api } from "./client";
import type {
  EnquiryDetailResponse,
  EnquiryListQuery,
  EnquiryListResponse,
  UpdateEnquiryStatusRequest,
  UpdateEnquiryStatusResponse,
} from "../../types/enquiry";

/** GET /api/admin/enquiries — paginated list (fixed sort: created_at DESC). */
export function listEnquiries(query: EnquiryListQuery = {}, signal?: AbortSignal): Promise<EnquiryListResponse> {
  return api.get<EnquiryListResponse>("/api/admin/enquiries", { query, signal });
}

/** GET /api/admin/enquiries/:id — full detail including `message`. */
export function getEnquiry(id: string, signal?: AbortSignal): Promise<EnquiryDetailResponse> {
  return api.get<EnquiryDetailResponse>(`/api/admin/enquiries/${id}`, { signal });
}

export function updateEnquiryStatus(id: string, body: UpdateEnquiryStatusRequest): Promise<UpdateEnquiryStatusResponse> {
  return api.patch<UpdateEnquiryStatusResponse>(`/api/admin/enquiries/${id}/status`, body);
}
