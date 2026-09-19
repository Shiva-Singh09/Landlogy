/* LANDLOGY admin service worker — scoped to /.
 * Single worker: existing Web Push behaviour + conservative PWA shell caching.
 * NEVER cache private API data here (see NETWORK_ONLY below).
 */
const LANDLOGY_ORIGIN = self.location.origin;
const APP_CACHE = 'landlogy-app-v1';
// App shell: navigation fallback. Static bundles are hashed, so this minimal
// precache cannot serve stale JS/CSS between deploys.

// Related entity types map to the real admin routes (never build one by adding "s").
const ENTITY_ROUTES = { enquiry: '/enquiries', property: '/properties', client: '/clients', notification: '/notifications' };
function routeFor(payload) {
  if (typeof payload.route === 'string' && payload.route.startsWith('/')) return payload.route;
  const base = ENTITY_ROUTES[payload.related_entity_type];
  return base && payload.related_entity_id ? `${base}/${payload.related_entity_id}` : '/notifications';
}

// Deliver push payloads as standard system notifications. No secrets are embedded
// in the worker; notification metadata is carried entirely in the pushed payload.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const title = payload.title || 'LANDLOGY';
  const body = payload.message || '';
  const tag = payload.id ? `landlogy-${payload.id}` : undefined;
  const options = {
    body,
    tag,
    data: { id: payload.id, route: routeFor(payload) },
    // The admin's in-app mute preference disables the system alert sound too.
    silent: payload.silent === true,
    requireInteraction: false,
    timestamp: payload.created_at ? Date.parse(payload.created_at) : Date.now(),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Click → focus existing LANDLOGY tab, or open a new one to the target route.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route || '/notifications';
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const same = all.find((client) => new URL(client.url).origin === LANDLOGY_ORIGIN);
      if (same) { same.focus(); await same.navigate(`${LANDLOGY_ORIGIN}${route}`); }
      else { await clients.openWindow(`${LANDLOGY_ORIGIN}${route}`); }
    })()
  );
});

// ---- App-shell caching (static content only) --------------------------------
// Private/admin API paths plus any non-GET request always go to the network and
// are never read from or written to the cache.
const NETWORK_ONLY = [/^\/api\//, /^\/uploads\//];
function networkOnly(url) {
  if (url.origin !== LANDLOGY_ORIGIN) return false;
  return NETWORK_ONLY.some((pattern) => pattern.test(url.pathname));
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.add('/')).then(() => self.skipWaiting()));
});

// Clean shutdown on activate.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== APP_CACHE && name.startsWith('landlogy-')).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// Pass through for navigations and same-asset requests (no runtime caching here).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Non-GET (mutations, uploads, auth) and all private API paths: network only.
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (networkOnly(url)) return;
  // Same-origin static assets: cache-first, then network with cache backfill.
  // Cross-origin requests (fonts/CDN) are left to the network untouched.
  if (url.origin !== LANDLOGY_ORIGIN || request.mode === 'navigate') {
    if (request.mode === 'navigate') {
      event.respondWith(fetch(request).catch(() => caches.match('/')));
    }
    return;
  }
  if (!/\.(js|css|png|svg|ico|webp|woff2?)$/.test(url.pathname) && url.pathname !== '/manifest.webmanifest') return;
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(APP_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
      }
      return response;
    }))
  );
});
