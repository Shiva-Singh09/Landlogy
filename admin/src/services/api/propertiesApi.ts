import { api } from "./client";
import type {
  CreatePropertyRequest,
  CreatePropertyResponse,
  PropertyDetailResponse,
  PropertyImage,
  PropertyImagesResponse,
  PropertyListQuery,
  PropertyListResponse,
  ReorderImagesResponse,
  SetPrimaryImageResponse,
  UpdatePropertyRequest,
  UpdatePropertyResponse,
  UpdatePropertyStatusResponse,
  UploadPropertyImageResponse,
} from "../../types/property";

/** GET /api/admin/properties — paginated list (server-side search/filter/sort). */
export function listProperties(query: PropertyListQuery = {}, signal?: AbortSignal): Promise<PropertyListResponse> {
  return api.get<PropertyListResponse>("/api/admin/properties", { query, signal });
}

/** POST /api/admin/properties — create property (Admin only). */
export function createProperty(body: CreatePropertyRequest): Promise<CreatePropertyResponse> {
  return api.post<CreatePropertyResponse>("/api/admin/properties", body);
}

/** GET /api/admin/properties/:id — full detail including status_history. */
export function getProperty(id: string, signal?: AbortSignal): Promise<PropertyDetailResponse> {
  return api.get<PropertyDetailResponse>(`/api/admin/properties/${id}`, { signal });
}

/** PATCH /api/admin/properties/:id — update editable fields (Admin only). */
export function updateProperty(id: string, body: UpdatePropertyRequest): Promise<UpdatePropertyResponse> {
  return api.patch<UpdatePropertyResponse>(`/api/admin/properties/${id}`, body);
}

/** PATCH /api/admin/properties/:id/status — transition status (Admin only). */
export function updatePropertyStatus(id: string, status: string): Promise<UpdatePropertyStatusResponse> {
  return api.patch<UpdatePropertyStatusResponse>(`/api/admin/properties/${id}/status`, { status });
}

/** DELETE /api/admin/properties/:id — delete property (Admin only). */
export function deleteProperty(id: string): Promise<{ ok: true; message: string }> {
  return api.del<{ ok: true; message: string }>(`/api/admin/properties/${id}`);
}

/** GET /api/admin/properties/:id/images — ordered images. */
export function listPropertyImages(id: string, signal?: AbortSignal): Promise<PropertyImagesResponse> {
  return api.get<PropertyImagesResponse>(`/api/admin/properties/${id}/images`, { signal });
}

/** POST /api/admin/properties/:id/images — upload one image (multipart, field "image"). */
export function uploadPropertyImage(
  propertyId: string,
  file: File,
  options: { caption?: string; isPrimary?: boolean } = {},
): Promise<UploadPropertyImageResponse> {
  const form = new FormData();
  form.append("image", file, file.name);
  if (options.caption) form.append("caption", options.caption);
  if (options.isPrimary) form.append("is_primary", "true");
  return api.post<UploadPropertyImageResponse>(`/api/admin/properties/${propertyId}/images`, form);
}

/** DELETE /api/admin/properties/:propertyId/images/:imageId — delete image. */
export function deletePropertyImage(propertyId: string, imageId: string): Promise<{ ok: true; message: string }> {
  return api.del<{ ok: true; message: string }>(`/api/admin/properties/${propertyId}/images/${imageId}`);
}

/** PATCH …/images/:imageId/primary — mark one image as primary. */
export function setPrimaryPropertyImage(propertyId: string, imageId: string): Promise<SetPrimaryImageResponse> {
  return api.patch<SetPrimaryImageResponse>(`/api/admin/properties/${propertyId}/images/${imageId}/primary`, {});
}

/** PATCH …/images/reorder — persist drag-free ordering ({ order: imageIds }). */
export function reorderPropertyImages(propertyId: string, order: string[]): Promise<ReorderImagesResponse> {
  return api.patch<ReorderImagesResponse>(`/api/admin/properties/${propertyId}/images/reorder`, { order });
}

export type { PropertyImage };
