import { createHash, ECDH } from 'node:crypto';
import db from '../../models/index.js';
import { pushConfig } from '../../services/common/pushService.js';

export const endpointHash = (endpoint) => createHash('sha256').update(endpoint).digest('hex');
// Push endpoints are outbound destinations. Accept known browser push services only.
export function validEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash &&
      (url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
       url.hostname.endsWith('.notify.windows.com') || url.hostname === 'web.push.apple.com' ||
       url.hostname.endsWith('.push.apple.com'));
  } catch { return false; }
}
function validKeys(keys) {
  if (!keys || !/^[\w-]{87}$/.test(keys.p256dh) || !/^[\w-]{22}$/.test(keys.auth)) return false;
  try { return ECDH.convertKey(Buffer.from(keys.p256dh, 'base64url'), 'prime256v1').length === 65; }
  catch { return false; }
}
export function getPushConfig(req, res) {
  const config = pushConfig();
  return res.json({ ok: true, enabled: Boolean(config), publicKey: config?.publicKey ?? null });
}
export async function saveSubscription(req, res) {
  const { subscription, silent = false } = req.body || {};
  if (!validEndpoint(subscription?.endpoint) || !validKeys(subscription?.keys) || typeof silent !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'Invalid browser push subscription.' });
  }
  if (!pushConfig()) return res.status(503).json({ ok: false, error: 'Browser notifications are not configured on the server.' });
  try {
    const endpoint_hash = endpointHash(subscription.endpoint);
    const [row] = await db.PushSubscription.findOrCreate({ where: { endpoint_hash }, defaults: {
      endpoint_hash, endpoint: subscription.endpoint, user_id: req.user.id,
      p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, silent,
    } });
    if (row.user_id !== req.user.id) return res.status(409).json({ ok: false, error: 'This browser subscription belongs to another account. Disable browser notifications and enable them again.' });
    await row.update({ p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, silent });
    return res.json({ ok: true });
  } catch { return res.status(503).json({ ok: false, error: 'Unable to save browser notification settings.' }); }
}
export async function removeSubscription(req, res) {
  if (!validEndpoint(req.body?.endpoint)) return res.status(400).json({ ok: false, error: 'Invalid push endpoint.' });
  try {
    await db.PushSubscription.destroy({ where: { user_id: req.user.id, endpoint_hash: endpointHash(req.body.endpoint) } });
    return res.json({ ok: true });
  } catch { return res.status(503).json({ ok: false, error: 'Unable to remove browser notification settings.' }); }
}
export async function notificationTarget(req, res) {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ ok: false, error: 'Invalid notification ID.' });
  try {
    const row = await db.Notification.findOne({ where: { id: req.params.id, recipient_user_id: req.user.id } });
    const targets = { enquiry: [db.Enquiry, '/enquiries'], property: [db.Property, '/properties'], client: [db.User, '/clients'] };
    const target = row && targets[row.related_entity_type];
    const exists = target && row.related_entity_id && await target[0].findByPk(row.related_entity_id, { attributes: ['id'] });
    return res.json({ ok: true, route: exists ? `${target[1]}/${row.related_entity_id}` : '/notifications' });
  } catch { return res.status(503).json({ ok: false, error: 'Unable to open notification. Please retry.' }); }
}
