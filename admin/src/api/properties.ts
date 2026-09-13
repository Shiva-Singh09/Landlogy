import { api } from './client';

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface Property {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  asking_price: string | null;
  status: 'draft' | 'under_review' | 'active' | 'rejected' | 'inactive' | 'sold' | 'archived';
  property_type_id: string | null;
  property_category_id: string | null;
  owner_id: string;
  reviewed_by: string | null;
  status_history: Array<{ from: string; to: string; at: string; by: string }> | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyListResponse {
  ok: boolean;
  properties: Property[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PropertyDetailResponse {
  ok: boolean;
  property: Property;
}

export interface PropertyImageListResponse {
  ok: boolean;
  images: PropertyImage[];
}

export async function getProperties(params?: {
  page?: number;
  limit?: number;
  status?: string;
  property_type_id?: string;
  city?: string;
  state?: string;
  search?: string;
}): Promise<PropertyListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.property_type_id) searchParams.set('property_type_id', params.property_type_id);
  if (params?.city) searchParams.set('city', params.city);
  if (params?.state) searchParams.set('state', params.state);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return api.get<PropertyListResponse>(`/api/admin/properties${query ? `?${query}` : ''}`);
}

export async function getProperty(id: string): Promise<PropertyDetailResponse> {
  return api.get<PropertyDetailResponse>(`/api/admin/properties/${id}`);
}

export async function createProperty(body: Record<string, unknown>): Promise<{ ok: boolean; property: Property }> {
  return api.post('/api/properties', body);
}

export async function updatePropertyStatus(id: string, status: string): Promise<{ ok: boolean; property: Property }> {
  return api.patch(`/api/admin/properties/${id}/status`, { status });
}

export async function getPropertyImages(id: string): Promise<PropertyImageListResponse> {
  return api.get<PropertyImageListResponse>(`/api/admin/properties/${id}/images`);
}

export async function uploadPropertyImage(
  id: string,
  file: File,
  caption?: string,
  isPrimary?: boolean
): Promise<{ ok: boolean; image: PropertyImage }> {
  const formData = new FormData();
  formData.append('image', file);
  if (caption) formData.append('caption', caption);
  if (isPrimary) formData.append('is_primary', 'true');
  return api.postMultipart(`/api/admin/properties/${id}/images`, formData);
}

export async function deletePropertyImage(propertyId: string, imageId: string): Promise<{ ok: boolean }> {
  return api.delete(`/api/admin/properties/${propertyId}/images/${imageId}`);
}
