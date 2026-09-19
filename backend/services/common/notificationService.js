import db from '../../models/index.js';
import { deliverAfterCommit } from './pushService.js';

const NOTIFICATION_TYPES = Object.freeze({
  NEW_ENQUIRY: 'new_enquiry',
  PROPERTY_REVIEW: 'property_review',
});

/**
 * Create an admin notification. Fire-and-forget: a failure is logged and
 * swallowed so it can never fail the triggering business operation (same
 * convention as the Activity logger).
 */
async function createNotification({
  recipient_user_id,
  type,
  title,
  message = null,
  related_entity_type = null,
  related_entity_id = null,
}) {
  try {
    const row = await db.Notification.create({
      recipient_user_id,
      type,
      title,
      message,
      related_entity_type,
      related_entity_id,
      is_read: false,
    });
    deliverAfterCommit([row]);
    return true;
  } catch (err) {
    console.error('[NOTIFICATION] Failed to record notification:', err.message);
    return false;
  }
}

// Recipients are resolved server-side, never from the submitted event payload.
async function notifyAdmins(event, { transaction } = {}) {
  const admins = await db.User.findAll({
    where: { role: 'admin', status: 'active' }, attributes: ['id'], transaction,
  });
  if (!admins.length) return;
  const rows = await db.Notification.bulkCreate(admins.map(({ id }) => ({
    recipient_user_id: id,
    type: event.type,
    title: event.title,
    message: event.message ?? null,
    related_entity_type: event.related_entity_type ?? null,
    related_entity_id: event.related_entity_id ?? null,
    is_read: false,
  })), { transaction });
   deliverAfterCommit(rows, transaction);
 }

export { createNotification, notifyAdmins, NOTIFICATION_TYPES };
