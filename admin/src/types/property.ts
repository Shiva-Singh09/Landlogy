/**
 * Property types mirroring the admin backend contract
 * (`controllers/admin/adminPropertyController.js`, `models/property.js`,
 * `models/propertyImage.js`).
 *
 * Notes:
 * - `asking_price` / `latitude` / `longitude` are PostgreSQL DECIMAL columns,
 *   so the backend may return them as strings — they are typed as
 *   `DecimalValue` and normalized with `parseDecimal` (see `utils/decimal.ts`).
 * - List/detail responses intentionally carry ID references only; the backend
 *   does not join owner / type / category data.
 */

import type { ApiResponse, PaginatedQuery, Pagination } from "./api";
import type { DecimalValue } from "../utils/decimal";

/** Property statuses from `utils/constants.js` / the `properties.status` ENUM. */
export type PropertyStatus =
  | "draft"
  | "under_review"
  | "active"
  | "rejected"
  | "inactive"
  | "sold"
  | "archived";

/**
 * One entry of `status_history` (JSONB). The backend writes two shapes:
 * creation entries use `{ status, at, by }` while status updates append
 * `{ from, to, at, by }` — so every field except `at`/`by` is optional.
 */
export interface StatusHistoryEntry {
  from?: string;
  to?: string;
  status?: string;
  at: string;
  by: string;
}

/** Item of `GET /api/admin/properties` (exact attribute list from the controller). */
export interface PropertyListItem {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  state: string | null;
  asking_price: DecimalValue;
  status: PropertyStatus;
  property_type_id: string | null;
  property_category_id: string | null;
  owner_id: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** `GET /api/admin/properties/:id` — full detail row. */
export interface Property extends PropertyListItem {
  address: string | null;
  pincode: string | null;
  latitude: DecimalValue;
  longitude: DecimalValue;
  status_history: StatusHistoryEntry[] | null;
}

/** Item of `GET /api/admin/properties/:id/images`. */
export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

/** Query params accepted by `GET /api/admin/properties` (DB-level search/filter/sort). */
export type PropertySortBy = "created_at" | "updated_at" | "asking_price" | "title";
export type PropertySortDir = "ASC" | "DESC";

export interface PropertyListQuery extends PaginatedQuery {
  status?: PropertyStatus;
  property_type_id?: string;
  property_category_id?: string;
  city?: string;
  state?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: PropertySortBy;
  sort_dir?: PropertySortDir;
}

export type PropertyListResponse = ApiResponse<{
  properties: PropertyListItem[];
  pagination: Pagination;
}>;

export type PropertyDetailResponse = ApiResponse<{
  property: Property;
  related?: {
    owner: { id: string; name: string; email: string; phone: string | null; status: string } | null;
    property_type: { id: string; name: string; slug: string } | null;
    property_category: { id: string; name: string; slug: string } | null;
  };
}>;

export type PropertyImagesResponse = ApiResponse<{
  images: PropertyImage[];
}>;

/** POST /PATCH payloads mirror the admin controller's allow-listed fields. */
export interface CreatePropertyRequest {
  title: string;
  description?: string | null;
  property_type_id?: string | null;
  property_category_id?: string | null;
  owner_id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  asking_price?: number | string | null;
}

export type CreatePropertyResponse = ApiResponse<{ property: Property }>;

export interface UpdatePropertyRequest {
  title?: string;
  description?: string | null;
  property_type_id?: string | null;
  property_category_id?: string | null;
  owner_id?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  asking_price?: number | string | null;
}

export type UpdatePropertyResponse = ApiResponse<{ property: Property }>;

export type UpdatePropertyStatusResponse = ApiResponse<{
  property: { id: string; status: PropertyStatus; reviewed_by: string | null; status_history: StatusHistoryEntry[] | null; updated_at: string };
}>;

export type UploadPropertyImageResponse = ApiResponse<{ image: PropertyImage }>;
export type SetPrimaryImageResponse = ApiResponse<{ image: PropertyImage }>;
export type ReorderImagesResponse = ApiResponse<{ images: PropertyImage[] }>;
