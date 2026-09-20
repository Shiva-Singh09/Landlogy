import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../models/index.js';
import {
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/client/clientNotificationController.js';
import { authorize } from '../middleware/auth.js';
import clientRouter from '../routes/client/index.js';
import adminRoutes from '../routes/admin/index.js';

// Seller notification coverage. Mirrors the conventions of the admin
// notification tests (node:test + t.mock.method) without touching them: these
// tests pin the seller-scoping guarantees of the new client-facing endpoints.

const seller = '11111111-1111-4111-8111-111111111111';
const otherUser = '33333333-3333-4333-8333-333333333333';
const notificationId = '22222222-2222-4222-8222-222222222222';

const request = (overrides = {}) => ({
  user: { id: seller, role: 'seller' },
  query: {},
  params: { id: notificationId },
  body: {},
  ...overrides,
});

function response() {
  return {
    code: 200,
    body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('seller list/detail queries are always scoped to the authenticated seller', async (t) => {
  t.mock.method(db.Notification, 'findAndCountAll', async (options) => {
    assert.deepEqual(options.where, { recipient_user_id: seller });
    assert.deepEqual(options.order, [['created_at', 'DESC'], ['id', 'DESC']]);
    return { rows: [], count: 0 };
  });
  t.mock.method(db.Notification, 'count', async ({ where }) => {
    assert.deepEqual(where, { recipient_user_id: seller, is_read: false });
    return 2;
  });

  const res = response();
  // A spoofed recipient_user_id in the query must be ignored entirely.
  await listNotifications(request({ query: { recipient_user_id: otherUser, page: '1', limit: '4' } }), res);

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.unreadCount, 2);
});

test('unread count is scoped to the authenticated seller and returned as a number', async (t) => {
  t.mock.method(db.Notification, 'count', async ({ where }) => {
    assert.deepEqual(where, { recipient_user_id: seller, is_read: false });
    return 5;
  });
  const res = response();
  await unreadCount(request(), res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ok: true, unreadCount: 5 });
});

test('pagination is validated and applied to the seller query', async (t) => {
  t.mock.method(db.Notification, 'findAndCountAll', async (options) => {
    assert.equal(options.limit, 10);
    assert.equal(options.offset, 10); // page 2
    assert.equal(options.distinct, true);
    return { rows: [{ id: notificationId }], count: 21 };
  });
  t.mock.method(db.Notification, 'count', async () => 3);

  const res = response();
  await listNotifications(request({ query: { page: '2', limit: '10' } }), res);

  assert.equal(res.code, 200);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 10, total: 21, totalPages: 3 });
  assert.equal(res.body.notifications.length, 1);
  assert.equal(res.body.unreadCount, 3);

  for (const query of [{ page: '0' }, { page: 'abc' }, { page: '1000001' }, { limit: '0' }, { limit: '101' }, { limit: '5.5' }]) {
    const bad = response();
    await listNotifications(request({ query }), bad);
    assert.equal(bad.code, 400, `expected 400 for ${JSON.stringify(query)}`);
    assert.equal(bad.body.ok, false);
  }

  const badFilter = response();
  await listNotifications(request({ query: { read: 'everything' } }), badFilter);
  assert.equal(badFilter.code, 400);
});

test('marking an own notification read is scoped and idempotent', async (t) => {
  const updates = [];
  t.mock.method(db.Notification, 'findOne', async (options) => {
    assert.deepEqual(options.where, { id: notificationId, recipient_user_id: seller });
    return {
      id: notificationId,
      is_read: false,
      async update(values) { updates.push(values); this.is_read = values.is_read; },
    };
  });

  const res = response();
  await markNotificationRead(request(), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.notification.is_read, true);
  assert.deepEqual(updates, [{ is_read: true }]);

  // Already-read notifications must not be written again.
  t.mock.method(db.Notification, 'findOne', async () => ({
    id: notificationId,
    is_read: true,
    async update(values) { updates.push(values); },
  }));
  const again = response();
  await markNotificationRead(request(), again);
  assert.equal(again.code, 200);
  assert.deepEqual(updates, [{ is_read: true }]);
});

test('a foreign or unknown notification id returns 404 and never updates', async (t) => {
  let updated = 0;
  t.mock.method(db.Notification, 'findOne', async (options) => {
    // The recipient filter is what makes another user's row unreachable.
    assert.deepEqual(options.where, { id: notificationId, recipient_user_id: seller });
    return null;
  });
  t.mock.method(db.Notification, 'update', async () => { updated += 1; return [1]; });

  const res = response();
  await markNotificationRead(request({ params: { id: notificationId } }), res);
  assert.equal(res.code, 404);
  assert.deepEqual(res.body, { ok: false, error: 'Notification not found.' });
  assert.equal(updated, 0);

  const invalid = response();
  await markNotificationRead(request({ params: { id: 'not-a-uuid' } }), invalid);
  assert.equal(invalid.code, 400);
  assert.equal(invalid.body.ok, false);
});

test('mark-all updates only the authenticated seller unread rows', async (t) => {
  const calls = [];
  t.mock.method(db.Notification, 'update', async (values, options) => {
    calls.push({ values, options });
    return [4];
  });

  const res = response();
  await markAllNotificationsRead(request(), res);

  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ok: true, updated: 4 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, { is_read: true });
  assert.deepEqual(calls[0].options.where, { recipient_user_id: seller, is_read: false });
});

test('database failures surface as 502 without leaking details', async (t) => {
  t.mock.method(db.Notification, 'findAndCountAll', async () => { throw new Error('connection lost'); });
  const res = response();
  await listNotifications(request({ query: { page: '1', limit: '4' } }), res);
  assert.equal(res.code, 502);
  assert.equal(res.body.ok, false);
  assert.equal(/connection lost/.test(res.body.error), false);
});

test('seller-only guard rejects an admin token and allows a seller token', () => {
  const guard = authorize('seller');

  let adminNext = false;
  const adminRes = response();
  guard({ user: { id: otherUser, role: 'admin' } }, adminRes, () => { adminNext = true; });
  assert.equal(adminRes.code, 403);
  assert.equal(adminRes.body.ok, false);
  assert.equal(adminNext, false, 'an admin token must never reach a seller notification handler');

  let sellerNext = false;
  guard({ user: { id: seller, role: 'seller' } }, response(), () => { sellerNext = true; });
  assert.equal(sellerNext, true);
});

test('seller notification routes are mounted on /api/client and admin routes are unchanged', () => {
  const pathsOf = (router) => router.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

  const sellerPaths = pathsOf(clientRouter);
  assert.ok(sellerPaths.includes('GET /notifications'));
  assert.ok(sellerPaths.includes('GET /notifications/unread-count'));
  assert.ok(sellerPaths.includes('PATCH /notifications/read-all'));
  assert.ok(sellerPaths.includes('PATCH /notifications/:id/read'));

  // Existing client routes must still be present.
  for (const path of ['GET /me', 'POST /properties', 'GET /properties', 'GET /properties/:id']) {
    assert.ok(sellerPaths.includes(path), `missing existing client route ${path}`);
  }

  const adminPaths = pathsOf(adminRoutes);
  // Admin notification surface (8 routes) must be exactly as before.
  for (const path of [
    'GET /notifications/push/config',
    'POST /notifications/push/subscriptions',
    'DELETE /notifications/push/subscriptions',
    'GET /notifications/:id/target',
    'GET /notifications',
    'GET /notifications/unread-count',
    'PATCH /notifications/read-all',
    'PATCH /notifications/:id/read',
  ]) {
    assert.ok(adminPaths.includes(path), `missing admin notification route ${path}`);
  }
});

