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

export const fetchClientMe = (token) => clientApi('/api/client/me', { token });
export const fetchClientProperties = (token) => clientApi('/api/client/properties', { token });
export const fetchClientProperty = (id, token) => clientApi(`/api/client/properties/${encodeURIComponent(id)}`, { token });
export const setClientPasswordApi = (currentPassword, newPassword, token) =>
  clientApi('/api/auth/set-password', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword },
    token
  });
