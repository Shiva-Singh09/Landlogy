import { API_BASE } from '../config/constants';

export const CLIENT_TOKEN_KEY = 'client_token';
export const CLIENT_USER_KEY = 'client_user';

export const CLIENT_STORE = {
  get(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value, remember) {
    try {
      (remember ? localStorage : sessionStorage).setItem(key, value);
    } catch {}
  },
  clear(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {}
  }
};

export function pushClientStorage() {
  // Small push-ready state used only by the seller push mode. No long-lived
  // token caches or large blobs — just the current push subscription key so
  // we can distinguish saved vs unsaved subscription during the flow.
  const key = '__landlogy_seller_push';
  try {
    const raw = CLIENT_STORE.get(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        get: () => parsed && (typeof parsed === 'object') ? parsed : null,
        set: (value) => {
          CLIENT_STORE.set(key, JSON.stringify(value), false);
          return value;
        },
        clear: () => CLIENT_STORE.clear(key)
      };
    }
  } catch {}
  const store = { value: null, set: (value) => { store.value = value; return value; }, clear: () => { store.value = null; } };
  return store;
}

export async function clientApi(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const authToken = token || CLIENT_STORE.get(CLIENT_TOKEN_KEY);

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    const error = new Error('network');
    error.code = 'NETWORK';
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok || (data && data.ok === false)) {
    const error = new Error((data && data.error) || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return data || {};
}

export const clientLoginApi = (email, password) =>
  clientApi('/api/auth/login', {
    method: 'POST',
    body: { email: String(email).trim().toLowerCase(), password }
  });

export const forgotPasswordApi = (email) =>
  clientApi('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: String(email).trim().toLowerCase() }
  });

export const verifyOtpApi = (email, otp) =>
  clientApi('/api/auth/verify-otp', {
    method: 'POST',
    body: { email: String(email).trim().toLowerCase(), otp: String(otp).trim() }
  });

export const resetPasswordApi = (resetToken, newPassword, confirmPassword) =>
  clientApi('/api/auth/reset-password', {
    method: 'POST',
    body: {
      reset_token: resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword
    }
  });

export const fetchClientMe = (token) => clientApi('/api/client/me', { token });
export const fetchClientProperties = (token) => clientApi('/api/client/properties', { token });
export const fetchClientProperty = (id, token) => clientApi(`/api/client/properties/${encodeURIComponent(id)}`, { token });
export const setClientPasswordApi = (currentPassword, newPassword, token) =>
  clientApi('/api/auth/set-password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
    token
  });

// ── Seller self-service password reset (Task 6 recovery flow) ──────────────
// Authenticated: the recipient is always derived server-side from the JWT, so
// the client never sends user_id/email. The request endpoint generates and
// dispatches an OTP; the verify endpoint confirms the OTP and applies the new
// password. Passwords/OTP are never persisted in the client store.
export const requestPasswordResetApi = (token) =>
  clientApi('/api/client/password-reset/request', {
    method: 'POST',
    // The reset request NEVER carries the new password — identity and the
    // password are handled only by the verify step.
    body: {},
    token
  });

export const verifyPasswordResetApi = (otp, newPassword, token) =>
  clientApi('/api/client/password-reset/verify', {
    method: 'POST',
    body: { otp, new_password: newPassword },
    token
  });

export const createClientProperty = (payload, token) =>
  clientApi('/api/client/properties', {
    method: 'POST',
    body: payload,
    token
  });

// ── Seller notifications ─────────────────────────────────────────────
// Recipient is always derived server-side from the JWT; the client never sends
// a recipient id. These reuse the shared clientApi() wrapper (auth, JSON and
// error handling stay in one place).
export const fetchClientNotifications = (page = 1, limit = 4, read = 'all', token) =>
  clientApi(
    `/api/client/notifications?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}&read=${encodeURIComponent(read)}`,
    { token }
  );

export const fetchClientUnreadCount = (token) =>
  clientApi('/api/client/notifications/unread-count', { token });

export const markClientNotificationRead = (id, token) =>
  clientApi(`/api/client/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    token
  });

export const markAllClientNotificationsRead = (token) =>
  clientApi('/api/client/notifications/read-all', {
    method: 'PATCH',
    token
  });

export const fetchClientPushConfig = (token) =>
  clientApi('/api/client/push/config', { token });

// Body shape mirrors the shared backend contract (adminPushController.saveSubscription):
// the subscription envelope is nested and `silent` rides at the top level.
export const saveClientPushSubscription = (record, token) =>
  clientApi('/api/client/push/subscribe', {
    method: 'POST',
    body: {
      subscription: { endpoint: record.endpoint, keys: record.keys },
      silent: record.silent ?? false
    },
    token
  });

// The seller route is DELETE /push/subscribe (mirrors the admin surface);
// the endpoint travels in the JSON body, never in a query string.
export const removeClientPushSubscription = (endpoint, token) =>
  clientApi('/api/client/push/subscribe', {
    method: 'DELETE',
    body: { endpoint },
    token
  });

export const fetchClientPushStatus = (token) =>
  clientApi('/api/client/push/status', { token });

// ── Push subscription extraction ──────────────────────────────────────────
// Base64url-encode an ArrayBuffer (PushSubscription.getKey results) — the
// backend validator expects unpadded base64url strings for p256dh/auth.
const toBase64Url = (value) => {
  if (!value) return null;
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Extract endpoint + keys from a browser PushSubscription. `getKey()` is the
// standard API and returns ArrayBuffers; older browsers only expose `toJSON()`,
// whose keys are already base64url. Missing keys surface as null (never
// fabricated) and the backend rejects the save, so the UI shows an error.
export async function pushSubscriptionDetails(subscription) {
  if (!subscription || !subscription.endpoint) {
    return { endpoint: null, keys: { p256dh: null, auth: null } };
  }
  let keys = { p256dh: null, auth: null };
  try {
    if (typeof subscription.getKey === 'function') {
      keys = {
        p256dh: toBase64Url(subscription.getKey('p256dh')),
        auth: toBase64Url(subscription.getKey('auth'))
      };
    } else {
      const json = subscription.toJSON();
      keys = { p256dh: json?.keys?.p256dh || null, auth: json?.keys?.auth || null };
    }
  } catch {}
  return { endpoint: subscription.endpoint, keys };
}

// Upload a single property image via multipart/form-data.
// Backend field name must be "image" (mirrors admin upload config).
// Supports is_primary caption via FormData fields.
export function uploadClientPropertyImage(propertyId, file, token, options = {}) {
  const { isPrimary = false, caption = '' } = options;
  const formData = new FormData();
  formData.append('image', file);
  if (isPrimary) formData.append('is_primary', 'true');
  if (caption) formData.append('caption', caption);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}/api/client/properties/${encodeURIComponent(propertyId)}/images`;

    const authToken = token || CLIENT_STORE.get(CLIENT_TOKEN_KEY);

    xhr.open('POST', url);
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (typeof options.onProgress === 'function') {
          options.onProgress(percent);
        }
      }
    };

    xhr.onload = () => {
      const status = xhr.status;
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}

      if (status < 200 || status >= 300) {
        const error = new Error((data && data.error) || `Upload failed (HTTP ${status})`);
        error.status = status;
        error.response = data;
        reject(error);
        return;
      }

      // Backend returns: { ok: true, image: { id, url, caption, is_primary, sort_order, created_at } }
      const image = (data && (data.image || data)) || null;
      resolve(image);
    };

    xhr.onerror = () => {
      const error = new Error('network');
      error.code = 'NETWORK';
      reject(error);
    };

    xhr.send(formData);
  });
}
