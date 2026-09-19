export interface AdminNotification {
  id: string;
  type: 'new_enquiry' | 'property_review' | (string & {});
  title: string;
  message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
export interface NotificationListResponse {
  ok: true;
  notifications: AdminNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
export function notificationTarget(notification: AdminNotification): string | null {
  const routes: Record<string, string> = { enquiry: '/enquiries', property: '/properties', client: '/clients' };
  const route = routes[notification.related_entity_type ?? ''];
  const id = notification.related_entity_id;
  return route && id && /^[0-9a-f-]{36}$/i.test(id) ? `${route}/${id}` : null;
}
