import { api } from './client';

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  message: string | null;
  intent: string | null;
  property_type: string | null;
  status: 'new' | 'reviewed' | 'converted' | 'rejected';
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryListResponse {
  ok: boolean;
  enquiries: Enquiry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EnquiryDetailResponse {
  ok: boolean;
  enquiry: Enquiry;
}

export async function getEnquiries(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<EnquiryListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return api.get<EnquiryListResponse>(`/api/admin/enquiries${query ? `?${query}` : ''}`);
}

export async function getEnquiry(id: string): Promise<EnquiryDetailResponse> {
  return api.get<EnquiryDetailResponse>(`/api/admin/enquiries/${id}`);
}

export async function updateEnquiryStatus(
  id: string,
  status: string,
  notes?: string
): Promise<{ ok: boolean; enquiry: Enquiry }> {
  return api.patch(`/api/admin/enquiries/${id}/status`, { status, notes });
}
