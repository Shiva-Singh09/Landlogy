import { api } from "./client";
import type { LoginRequest, LoginResponse } from "../../types/api";

/**
 * POST /api/auth/login — shared login (role is in the JWT).
 * Unauthenticated by definition (`auth: false` skips the Bearer header).
 * Callers must verify `user.role === "admin"` before granting admin access.
 */
export function loginAdmin(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/login", credentials, { auth: false });
}
