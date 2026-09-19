import db from '../../models/index.js';
import { invalidateAuthCache } from '../../middleware/auth.js';
import { recordActivity, describeActivity, ACTIVITY_ACTIONS } from '../../services/common/activityLog.js';

// ── Admin Client (Seller) Management ─────────────────────────────
// Clients = users with role='seller'. Admins/brokers never exposed here.
// Only status is mutable via these endpoints; role/credentials untouched.

// Must mirror the User model ENUM for status (model: users.status).
const CLIENT_STATUSES = ['active', 'inactive', 'suspended'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Safe projection — never include password_hash / tokens / OTP data.
const CLIENT_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'status', 'is_email_verified', 'is_phone_verified', 'force_password_change', 'last_login_at', 'created_at', 'updated_at'];

const safeClient = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  status: u.status,
  is_email_verified: u.is_email_verified,
  is_phone_verified: u.is_phone_verified,
  force_password_change: u.force_password_change,
  last_login_at: u.last_login_at,
  created_at: u.created_at,
  updated_at: u.updated_at,
});

// GET /api/admin/clients — List sellers (Admin only)
export const listClients = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Always restrict to sellers.
    const where = { role: 'seller' };

    if (status) {
      if (!CLIENT_STATUSES.includes(status)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid status. Allowed values: ${CLIENT_STATUSES.join(', ')}.`,
        });
      }
      where.status = status;
    }

    // Search by name, email, or phone (same iLike convention as admin enquiries).
    if (search && String(search).trim()) {
      const searchTerm = `%${String(search).trim()}%`;
      where[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.iLike]: searchTerm } },
        { email: { [db.Sequelize.Op.iLike]: searchTerm } },
        { phone: { [db.Sequelize.Op.iLike]: searchTerm } },
      ];
    }

    const { count, rows } = await db.User.findAndCountAll({
      where,
      attributes: CLIENT_ATTRIBUTES,
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      ok: true,
      clients: rows.map(safeClient),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list clients:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve clients right now. Please try again later.' });
  }
};

// GET /api/admin/clients/:id — Get single seller (Admin only)
export const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid client ID format.' });
    }
    // Role scoped: non-sellers treated as not found for this endpoint.
    const user = await db.User.findOne({ where: { id, role: 'seller' }, attributes: CLIENT_ATTRIBUTES });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Client not found.' });
    }
    return res.json({ ok: true, client: safeClient(user) });
  } catch (err) {
    console.error('[ADMIN] Failed to get client:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve client right now. Please try again later.' });
  }
};

// PATCH /api/admin/clients/:id/status — Update seller status (Admin only)
export const updateClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid client ID format.' });
    }
    if (!status) {
      return res.status(400).json({ ok: false, error: 'Status is required.' });
    }
    if (!CLIENT_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: `Invalid status. Allowed values: ${CLIENT_STATUSES.join(', ')}.` });
    }
    const user = await db.User.findOne({ where: { id, role: 'seller' } });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Client not found.' });
    }
    const previousStatus = user.status;
    user.status = status;
    await user.save();
    // Status gates auth (authenticate rejects non-active); drop the cached
    // whoami row so suspension/reactivation takes effect immediately.
    invalidateAuthCache(user.id);
    console.log(`[ADMIN] Client ${id} status updated to '${status}' by admin ${req.user.id}`);
    recordActivity(ACTIVITY_ACTIONS.CLIENT_STATUS_CHANGED, {
      actorUserId: req.user.id,
      entityType: 'client',
      entityId: user.id,
      description: describeActivity(ACTIVITY_ACTIONS.CLIENT_STATUS_CHANGED, { label: user.name, from: previousStatus, to: status }),
    });
    return res.json({
      ok: true,
      client: { id: user.id, status: user.status, updated_at: user.updated_at },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to update client status:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update client status right now. Please try again later.' });
  }
};
