const TOKEN_STORAGE_KEY = "landlogy_admin_token";
const PROFILE_STORAGE_KEY = "landlogy_admin_profile";

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  const raw =
    typeof fromEnv === "string" && fromEnv.trim().length > 0
      ? fromEnv.trim()
      : "http://localhost:5000";
  return raw.replace(/\/+$/, "");
}

/** Base URL of the LANDLOGY backend API (no trailing slash). */
export const API_BASE_URL = resolveBaseUrl();

/** Read the stored admin auth token, or `null` when signed out. */
export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist the admin auth token after a successful login. */
export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage may be unavailable (private mode, blocked cookies, SSR).
    // Requests will simply go out unauthenticated and receive a 401.
  }
}

export function setAdminProfile(profile: { name: string; email: string; role: string; force_password_change: boolean }): void {
  try { window.sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch { /* Display-only profile cache. */ }
}

export function getAdminProfile(): { name: string; email: string; role: string; force_password_change: boolean } | null {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(PROFILE_STORAGE_KEY) ?? "null");
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    return typeof record.name === "string" && typeof record.email === "string" && typeof record.role === "string" && typeof record.force_password_change === "boolean"
      ? { name: record.name, email: record.email, role: record.role, force_password_change: record.force_password_change } : null;
  } catch { return null; }
}

/** Drop the stored admin auth token (sign out / expired session). */
export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    // Nothing to do — the token is already effectively gone.
  }
}

/** Error thrown for failed API calls. `status` is HTTP status (0 = network). */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  /**
   * Query params — null/undefined/empty values are omitted.
   * Typed as a plain object (not a Record) so specific query interfaces
   * like PropertyListQuery remain assignable; values are stringified.
   */
  query?: object;
  /** JSON body, or FormData for multipart uploads. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Attach Bearer token. Defaults true; use false for login/health. */
  auth?: boolean;
}

function buildQueryString(query?: object): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function buildUrl(path: string, query?: object): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${base}${buildQueryString(query)}`;
}

function fallbackMessageForStatus(status: number): string {
  if (status === 400) return "The request could not be understood. Please check the input and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "This action conflicts with the current state. Please refresh and try again.";
  if (status === 413) return "The request is too large.";
  if (status === 429) return "Too many requests. Please try again later.";
  if (status >= 500) return "Unable to process the request right now. Please try again later.";
  return `The request failed (status ${status}). Please try again.`;
}

/** Extract only the backend's public error/message string; never internals. */
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = fallbackMessageForStatus(response.status);
  try {
    const text = await response.text();
    if (!text) return fallback;
    const data: unknown = JSON.parse(text);
    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;
      for (const key of ["error", "message"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) return value;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Generic typed request. Resolves with parsed JSON; throws ApiError on
 * non-2xx and rethrows AbortError when `signal` aborts.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, headers = {}, signal, auth = true } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders: Record<string, string> = { ...headers };
  if (body !== undefined && !isFormData && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getAuthToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: finalHeaders,
      body: body === undefined || isFormData ? (body as BodyInit | undefined) : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Unable to reach the server. Please check your connection and try again.");
  }
  // No admin token-refresh endpoint exists, so 401 means re-login:
  // drop the stale token so callers can redirect to sign-in.
  if (response.status === 401 && auth) clearAuthToken();
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "Received an unexpected response from the server.");
  }
}

type OptionsWithoutMethod = Omit<RequestOptions, "method" | "body">;

/** Convenience wrappers over apiRequest. */
export const api = {
  get: <T>(path: string, options: OptionsWithoutMethod = {}): Promise<T> =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: OptionsWithoutMethod = {}): Promise<T> =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options: OptionsWithoutMethod = {}): Promise<T> =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  del: <T>(path: string, options: OptionsWithoutMethod = {}): Promise<T> =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
