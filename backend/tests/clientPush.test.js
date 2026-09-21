// ── Seller push-subscription coverage ────────────────────────────────────
// Reuses the role-agnostic handlers (req.user.id from the JWT). These tests pin
// the seller-only scoping guarantees and confirm admin push routes are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../models/index.js';
import clientRouter from '../routes/client/index.js';
import adminRoutes from '../routes/admin/index.js';

const seller = '11111111-1111-4111-8111-111111111111';
const otherUser = '33333333-3333-4333-8333-333333333333';

// Seller push endpoints require configuration; set env so pushConfig() is truthy
// for the subscribe/save path tests. These are read at call time (not load), and
// no real web-push send happens here.
process.env.VAPID_PUBLIC_KEY = 'BJC3sOktuYwlYsRmNqZ2llswhKOL3NpJBMHfP27097xZIaJPWYBZgxD-lMvLcFneK7d06DVt2VAQFl_zQOLLljs';
process.env.VAPID_PRIVATE_KEY = 'aeKFsjydAjHAHAIzqDlF6JSYI7cWukuFoDKE5k6kV08';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';

const authReq = (overrides = {}) => ({
  user: { id: seller, role: 'seller' },
  params: {}, query: {}, body: {}, ...overrides,
});
function response() {
  return {
    code: 200, body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}
const pathsOf = (router) => router.stack
  .filter((layer) => layer.route)
  .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

// Routes are mounted eagerly at require time, so the router stack is safe to
// inspect directly (Express preserves insertion order of route definitions).
test('seller push routes are mounted on /api/client and admin push routes are unchanged', () => {
  const sellerPaths = pathsOf(clientRouter);
  assert.ok(sellerPaths.includes('GET /push/config'));
  assert.ok(sellerPaths.includes('POST /push/subscribe'));
  assert.ok(sellerPaths.includes('DELETE /push/subscribe'));
  assert.ok(sellerPaths.includes('GET /push/status'));
  for (const path of ['GET /me', 'POST /properties', 'GET /notifications']) {
    assert.ok(sellerPaths.includes(path), `missing existing client route ${path}`);
  }
  const adminPaths = pathsOf(adminRoutes);
  for (const path of [
    'GET /notifications/push/config', 'POST /notifications/push/subscriptions',
    'DELETE /notifications/push/subscriptions', 'GET /notifications/:id/target',
  ]) {
    assert.ok(adminPaths.includes(path), `admin route ${path} must remain unchanged`);
  }
});

test('push status reports unsupported when server push is not configured', async (t) => {
  t.mock.method(db.PushSubscription, 'count', async () => 0);
  const prev = { pub: process.env.VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY };
  process.env.VAPID_PUBLIC_KEY = ''; process.env.VAPID_PRIVATE_KEY = '';
  // Re-import so pushConfig picks up the (now empty) env at call time.
  const mod = await import('../controllers/client/clientPushController.js');
  const res = response();
  await mod.pushStatus(authReq(), res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { ok: true, enabled: false, publicKey: null, subscribed: false });
  process.env.VAPID_PUBLIC_KEY = prev.pub; process.env.VAPID_PRIVATE_KEY = prev.priv;
});

test('push status reflects whether the seller has a stored subscription', async (t) => {
  // pushConfig() reads env keys from process.env at call time; ensure the
  // shared pushService sees a configured environment for this case.
  const prev = { pub: process.env.VAPID_PUBLIC_KEY, priv: process.env.VAPID_PRIVATE_KEY, subj: process.env.VAPID_SUBJECT };
  process.env.VAPID_PUBLIC_KEY = 'BJC3sOktuYwlYsRmNqZ2llswhKOL3NpJBMHfP27097xZIaJPWYBZgxD-lMvLcFneK7d06DVt2VAQFl_zQOLLljs';
  process.env.VAPID_PRIVATE_KEY = 'aeKFsjydAjHAHAIzqDlF6JSYI7cWukuFoDKE5k6kV08';
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  let countedWhere;
  t.mock.method(db.PushSubscription, 'count', async ({ where }) => { countedWhere = where; return 1; });
  const { pushStatus } = await import('../controllers/client/clientPushController.js');
  const res = response();
  await pushStatus(authReq(), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.subscribed, true);
  assert.equal(countedWhere.user_id, seller);
  process.env.VAPID_PUBLIC_KEY = prev.pub; process.env.VAPID_PRIVATE_KEY = prev.priv; process.env.VAPID_SUBJECT = prev.subj;
});

// The shared removeSubscription handler derives the user from the verified JWT
// and deletes only rows matching `user_id + endpoint_hash`. This test confirms the
// seller can never touch another user's subscription row.
test('removeSubscription deletes only the authenticated seller subscription', async (t) => {
  let destroyedWhere;
  t.mock.method(db.PushSubscription, 'destroy', async (options) => { destroyedWhere = options.where; return 1; });
  const { removeSubscription } = await import('../controllers/client/clientPushController.js');
  const res = response();
  await removeSubscription(authReq({ body: { endpoint: 'https://fcm.googleapis.com/x' } }), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(destroyedWhere.user_id, seller);
  assert.match(destroyedWhere.endpoint_hash, /^[0-9a-f]{64}$/);
});


