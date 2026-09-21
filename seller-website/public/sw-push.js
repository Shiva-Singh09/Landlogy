// ── LANDLOGY seller service-worker: PWA shell + Web Push (one worker) ────
// Single shared worker for the seller-app lifecycle (minimal static-shell
// caching below) + incoming push. The React app owns the in-app notification
// UI; this worker only renders system notifications when the tab/background/
// installed PWA cannot. The push behaviour below is untouched by PWA caching.
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

// ── PWA lifecycle — minimal, static-only caching ──────────────────────────
// Hashed build assets and brand icons are cache-first (immutable content);
// navigations are network-first with the cached shell as offline fallback.
// /api/*, /uploads/*, every non-GET request and cross-origin requests are
// NEVER intercepted — private/dynamic data can never be served stale.
const STATIC_CACHE = 'landlogy-static-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png',
  '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // cache:'reload' bypasses the HTTP cache — the shell is never pre-cached stale.
    await Promise.all(PRECACHE.map((path) => cache
      .add(new Request(APP_URL + path, { cache: 'reload' }))
      .catch(() => undefined)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('landlogy-') && name !== STATIC_CACHE)
      .map((name) => caches.delete(name)));
    self.clients.claim();
  })());
});

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

// ── PWA fetch: static assets only — private/dynamic data always hits network ─
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Non-GET (mutations, uploads, auth) is never intercepted or cached.
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  // Cross-origin requests (fonts/CDN) are left to the network untouched.
  if (url.origin !== APP_URL) return;
  // Seller API + uploads: network only — never cached, never served stale.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return;
  // SPA navigations: network-first; the cached shell only covers offline startup.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }
  // Same-origin static assets (+ manifest): cache-first with backfill. Bundle
  // filenames are hashed, so a cache hit can never be a stale build.
  if (!/\.(js|css|png|svg|ico|webp|woff2?)$/.test(url.pathname)
    && url.pathname !== '/manifest.webmanifest') return;
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
      }
      return response;
    }))
  );
});
