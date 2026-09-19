/**
 * Shared API envelope types. These mirror the backend's actual JSON shapes:
 * success payloads carry `ok: true` plus endpoint-specific keys, and every
 * failure carries `{ ok: false, error: string }` (see `middleware/security.js`
 * and all admin/common controllers).
 */

/** Backend success envelope: `ok: true` plus the endpoint's own payload keys. */
export type ApiResponse<T> = T & { ok: true };

/** Backend failure envelope returned for every 4xx/5xx JSON error. */
export interface ApiErrorBody {
  ok: false;
  error: string;
}

/** Pagination block returned by every paginated admin list endpoint. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Common optional pagination query params (`page` defaults to 1, `limit` to 20, max 100). */
export interface PaginatedQuery {
  page?: number;
  limit?: number;
}

/** User roles from the backend `users.role` ENUM. */
export type UserRole = "admin" | "broker" | "seller";

/**
 * Authenticated user as returned by `POST /api/auth/login`
 * (`controllers/common/authController.js` — safe fields only).
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  force_password_change: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = ApiResponse<{
  token: string;
  user: AuthUser;
}>;
