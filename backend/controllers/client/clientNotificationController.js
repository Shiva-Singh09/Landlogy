import db from '../../models/index.js';

// ── Seller (client) notification API ─────────────────────────────────
// Seller-scoped twin of the admin notification controller. The admin module is
// FINAL and untouched: this controller reuses the shared `notifications` table
// and the exact same JSON contract, but every query is scoped to the
// authenticated seller with `recipient_user_id: req.user.id`.
//
// A client-supplied recipient_user_id (query or body) is never read, so a
// seller can only ever list or mutate their own rows; an admin-scoped row
// belongs to a different recipient_user_id and is therefore invisible here.

const NOTIFICATION_ATTRIBUTES = [
  'id',
  'type',
  'title',
  'message',
  'related_entity_type',
  'related_entity_id',
  'is_read',
  'created_at',
  'updated_at',
];

const READ_FILTERS = Object.freeze({ all: 'all', read: 'read', unread: 'unread' });
const NOTIFICATION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/client/notifications — list notifications for the authenticated seller.
async function listNotifications(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ ok: false, error: 'Page must be a positive integer; limit must be between 1 and 100.' });
    }
    const filter = Object.prototype.hasOwnProperty.call(READ_FILTERS, req.query.read)
      ? req.query.read
      : null;

    if (req.query.read !== undefined && filter === null) {
      return res.status(400).json({ ok: false, error: 'Invalid read filter. Allowed values: all, read, unread.' });
    }

    // Recipient is always derived from the verified JWT user — never the request.
    const where = { recipient_user_id: req.user.id };
    if (filter === 'read') where.is_read = true;
    if (filter === 'unread') where.is_read = false;

    const { rows, count } = await db.Notification.findAndCountAll({
      where,
      attributes: NOTIFICATION_ATTRIBUTES,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    return res.json({
      ok: true,
      notifications: rows,
      unreadCount: await db.Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } }),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('[CLIENT] List notifications error:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve notifications right now. Please try again later.' });
  }
}

// PATCH /api/client/notifications/:id/read — idempotent read-marking (own only).
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    if (!NOTIFICATION_ID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid notification ID format.' });
    }

    // Foreign ids belong to another recipient → not found for this seller.
    const notification = await db.Notification.findOne({
      where: { id, recipient_user_id: req.user.id },
      attributes: NOTIFICATION_ATTRIBUTES,
    });

    if (!notification) {
      return res.status(404).json({ ok: false, error: 'Notification not found.' });
    }

    if (!notification.is_read) {
      await notification.update({ is_read: true });
    }

    return res.json({ ok: true, notification });
  } catch (err) {
    console.error('[CLIENT] Mark notification read error:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to mark notification as read right now. Please try again later.' });
  }
}

// PATCH /api/client/notifications/read-all — mark the seller's own unread as read.
async function markAllNotificationsRead(req, res) {
  try {
    const [updatedCount] = await db.Notification.update(
      { is_read: true },
      { where: { recipient_user_id: req.user.id, is_read: false } }
    );

    return res.json({ ok: true, updated: updatedCount });
  } catch (err) {
    console.error('[CLIENT] Mark all notifications read error:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to mark notifications as read right now. Please try again later.' });
  }
}

// GET /api/client/notifications/unread-count — badge count for the authenticated seller.
async function unreadCount(req, res) {
  try {
    const count = await db.Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } });
    return res.json({ ok: true, unreadCount: count });
  } catch (err) {
    console.error('[CLIENT] Notification count error:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve notification count.' });
  }
}

export { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead };
