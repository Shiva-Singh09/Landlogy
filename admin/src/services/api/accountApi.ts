import { api } from "./client";
import type { AdminProfileResponse, ChangePasswordRequest, ChangePasswordResponse } from "../../types/account";

/** GET /api/admin/me — live profile of the authenticated admin (safe projection). */
export function getAdminMe(signal?: AbortSignal): Promise<AdminProfileResponse> {
  return api.get<AdminProfileResponse>("/api/admin/me", { signal });
}

/**
 * POST /api/auth/set-password — reuses the existing authenticated endpoint.
 * The backend re-checks the current password with bcrypt before hashing and
 * storing the new one; passwords are never logged or persisted in plain text.
 */
export function changeAdminPassword(body: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return api.post<ChangePasswordResponse>("/api/auth/set-password", body);
}
