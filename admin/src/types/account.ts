/**
 * Admin account types mirroring the existing backend contracts:
 * `GET /api/admin/me` (safe profile projection) and
 * `POST /api/auth/set-password` (authenticated password rotation).
 */

import type { ApiResponse, UserRole } from "./api";

/** Profile returned by `GET /api/admin/me` — no password/token fields exist here. */
export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  force_password_change: boolean;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AdminProfileResponse = ApiResponse<{ user: AdminProfile }>;

/** Body for `POST /api/auth/set-password` (password is verified server-side). */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export type ChangePasswordResponse = ApiResponse<{
  message: string;
  force_password_change: boolean;
}>;
