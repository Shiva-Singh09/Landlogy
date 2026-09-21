// ── Seller (client) push-subscription handlers ────────────────────────
// The subscription CRUD itself is role-agnostic and already lives in the shared
// admin push controller (`req.user.id` is always derived from the JWT there), so
// this module RE-USES those exact handlers — no duplicated validation or
// delivery logic. Only a seller-scoped status endpoint is added here.
// Backend-only: this file does not touch admin/ (the React app is untouched).
import db from '../../models/index.js';
import { pushConfig } from '../../services/common/pushService.js';
import { getPushConfig, saveSubscription, removeSubscription } from '../../controllers/admin/adminPushController.js';

export { getPushConfig, saveSubscription, removeSubscription };

// GET /api/client/push/status
// Lightweight status used by the seller UI to render the push settings control
// (unsupported / granted+subscribed / granted+missing / denied). No PII is
// exposed — only presence of a stored subscription for the authenticated user.
export async function pushStatus(req, res) {
  const config = pushConfig();
  if (!config) {
    return res.json({ ok: true, enabled: false, publicKey: null, subscribed: false });
  }
  try {
    const count = await db.PushSubscription.count({ where: { user_id: req.user.id } });
    return res.json({ ok: true, enabled: true, publicKey: config.publicKey, subscribed: count > 0 });
  } catch (err) {
    console.error('[PUSH] Status check failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to check notification status right now. Please try again later.' });
  }
}
