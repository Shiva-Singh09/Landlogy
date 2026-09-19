import webpush from 'web-push';
import db from '../../models/index.js';

export function pushConfig() {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  if (!publicKey || !privateKey || !subject) return null;
  try { webpush.setVapidDetails(subject, publicKey, privateKey); return { publicKey }; }
  catch { return null; }
}

export function pushPayload(notification, silent = false) {
  return JSON.stringify({
    id: notification.id, title: notification.title, message: (notification.message || '').slice(0, 500),
    type: notification.type, related_entity_type: notification.related_entity_type,
    related_entity_id: notification.related_entity_id, created_at: notification.created_at || new Date().toISOString(), silent,
  });
}

// Best effort only: transport errors never propagate into business transactions.
export async function sendNotificationPush(notification) {
  if (!notification?.id || !pushConfig()) return;
  try {
    const subscriptions = await db.PushSubscription.findAll({ where: { user_id: notification.recipient_user_id } });
    for (const row of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          pushPayload(notification, row.silent), { TTL: 86400, timeout: 5000 });
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) await row.destroy();
        else console.warn('[PUSH] Delivery unavailable', error.statusCode || 'transport');
      }
    }
  } catch { console.warn('[PUSH] Subscription delivery unavailable'); }
}

export function deliverAfterCommit(rows, transaction) {
  const deliver = () => { for (const row of rows || []) void sendNotificationPush(row); };
  if (transaction) transaction.afterCommit(deliver);
  else deliver();
}
