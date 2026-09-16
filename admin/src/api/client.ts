const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

// Keep the Vite proxy working locally, but require an explicit backend URL in
// production where a same-origin reverse proxy cannot be assumed.
const API_BASE = configuredApiBase || (import.meta.env.DEV
  ? ''
  : (() => {
      throw new Error('VITE_API_BASE_URL is required for production builds.');
    })());

export interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

class ApiClient {
  private getHeaders(isMultipart = false): HeadersInit {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const isMultipart = options.body instanceof FormData;
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: this.getHeaders(isMultipart),
    });

    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async postMultipart<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: formData,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
