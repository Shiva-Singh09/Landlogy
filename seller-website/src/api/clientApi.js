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
