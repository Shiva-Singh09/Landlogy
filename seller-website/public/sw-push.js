// ── Minimal seller service-worker for Web Push (foreground+background) ───
// One shared worker for the seller-app lifecycle + incoming push. The React app
// owns the in-app notification UI; this worker only renders system notifications
// when the tab/background/PWA cannot.
'use strict';
const APP_URL = self.location.origin;
const STANDARD_ICON = `${APP_URL}/icon-192.png`;

// Related seller entities map to real seller-portal routes only — a push or a
// notification click can never send the seller to an admin route.
const ENTITY_ROUTES = { property: '/client-portal/properties' };
function routeFor(data) {
  if (typeof data.url === 'string' && data.url.startsWith('/client-portal')) return data.url;
  const base = ENTITY_ROUTES[data.related_entity_type];
  return base && data.related_entity_id ? `${base}/${data.related_entity_id}` : '/client-portal';
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? JSON.parse(event.data.text()) : {}; } catch { /* use defaults */ }
  const tag = data.tag || `ln-${data.notification_id || data.id || Math.random().toString(36).slice(2)}`;
  const url = routeFor(data);

  event.waitUntil((async () => {
    // Foreground: hand the payload to the focused LANDLOGY portal tab instead of
    // raising a duplicate OS notification. The app syncs its in-app list/badge
    // and plays the chime when the seller's sound preference allows it.
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const app = clients.find((client) => client.url.startsWith(`${APP_URL}/client-portal`)
        && client.focused === true && 'postMessage' in client);
      if (app) {
        app.postMessage({ type: 'landlogy_push', payload: { ...data, url } });
        return;
      }
    } catch { /* fall through to a system notification. */ }

    // Background tab / closed browser / PWA in background: system notification.
    // The seller's stored sound preference rides in the payload as `silent` and
    // becomes the system notification's sound flag (the notification itself is
    // still delivered).
    const title = data.title || 'LANDLOGY notification';
    await self.registration.showNotification(title, {
      body: data.body || data.message || '',
      icon: data.icon || STANDARD_ICON,
      badge: data.badge || STANDARD_ICON,
      tag,
      silent: data.silent === true,
      requireInteraction: data.requireInteraction === true,
      data: { url, notification_id: data.notification_id, id: data.id },
      actions: data.actions || [],
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/client-portal';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const focused = clients.find((client) => client.url.startsWith(APP_URL) && 'focus' in client);
    if (focused) return focused.focus().then((client) => client.postMessage({ type: 'notification_focus', url }));
    return clients.openWindow(url);
  }));
});
