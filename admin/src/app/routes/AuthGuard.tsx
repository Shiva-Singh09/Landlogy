import { Navigate, Outlet } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../services/api/client";

/**
 * Client-side session check for the stored admin JWT.
 *
 * The backend has no session-validation endpoint, so this performs the safest
 * local check compatible with the existing contract: the token must exist and,
 * if it carries a standard `exp` claim, must not be expired. Actual credential
 * validity is enforced by the API itself — any authenticated 401 clears the
 * token inside the API client, and the next navigation re-runs this guard.
 */
function isTokenCurrent(token: string): boolean {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true; // opaque token — defer to the API
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)),
    );
    return typeof payload.exp !== "number" || payload.exp * 1000 > Date.now();
  } catch {
    return true; // unparseable — defer to the API rather than blocking
  }
}

/** Blocks unauthenticated/expired access to protected admin routes. */
export function RequireAdmin() {
  const token = getAuthToken();
  if (!token || !isTokenCurrent(token)) {
    clearAuthToken();
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/** Sends already-authenticated admins away from /login. */
export function GuestOnly() {
  const token = getAuthToken();
  if (token && isTokenCurrent(token)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
