import db from '../../models/index.js';

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

// GET /api/admin/notifications — list notifications for the authenticated admin.
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
    console.error('List notifications error:', err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve notifications right now. Please try again later.' });
  }
}

// PATCH /api/admin/notifications/:id/read — idempotent read-marking (own only).
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid notification ID format.' });
    }

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
    console.error('Mark notification read error:', err);
    return res.status(502).json({ ok: false, error: 'Unable to mark notification as read right now. Please try again later.' });
  }
}

// PATCH /api/admin/notifications/read-all — mark all own unread as read.
async function markAllNotificationsRead(req, res) {
  try {
    const [updatedCount] = await db.Notification.update(
      { is_read: true },
      { where: { recipient_user_id: req.user.id, is_read: false } }
    );

    return res.json({ ok: true, updated: updatedCount });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    return res.status(502).json({ ok: false, error: 'Unable to mark notifications as read right now. Please try again later.' });
  }
}

async function unreadCount(req, res) {
  try {
    const unreadCount = await db.Notification.count({ where: { recipient_user_id: req.user.id, is_read: false } });
    return res.json({ ok: true, unreadCount });
  } catch (err) {
    console.error('Notification count error:', err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve notification count.' });
  }
}

export { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead };
