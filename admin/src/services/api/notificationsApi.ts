import { apiRequest } from './client';
import type { AdminNotification, NotificationListResponse } from '../../types/notification';
const base = '/api/admin/notifications';
export const listNotifications = (page = 1, limit = 20, signal?: AbortSignal) =>
  apiRequest<NotificationListResponse>(base, { query: { page, limit }, signal });
export const getNotificationUnreadCount = (signal?: AbortSignal) =>
  apiRequest<{ ok: true; unreadCount: number }>(`${base}/unread-count`, { signal });
export const markNotificationRead = (id: string) =>
  apiRequest<{ ok: true; notification: AdminNotification }>(`${base}/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () =>
  apiRequest<{ ok: true; updated: number }>(`${base}/read-all`, { method: 'PATCH' });

export interface PushConfigResponse { ok: true; enabled: boolean; publicKey: string | null; }
export interface PushSubscriptionRecord { endpoint: string; keys: { p256dh: string; auth: string }; silent?: boolean; }
export const getPushConfig = (signal?: AbortSignal) =>
  apiRequest<PushConfigResponse>(`${base}/push/config`, { signal });
  export const saveSubscription = (record: PushSubscriptionRecord) =>
  apiRequest<{ ok: boolean }>(`${base}/push/subscriptions`, { method: 'POST', body: { subscription: { endpoint: record.endpoint, keys: record.keys }, silent: record.silent ?? false } });
export const removeSubscription = (endpoint: string) =>
  apiRequest<{ ok: boolean }>(`${base}/push/subscriptions`, { method: 'DELETE', body: { endpoint } });
