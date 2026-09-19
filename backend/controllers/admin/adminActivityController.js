import { Op } from 'sequelize';
import db from '../../models/index.js';

// ── GET /api/admin/activity (Admin only) ─────────────────────────────
// Read-only, paginated history of real backend operations recorded into
// activity_logs by services/common/activityLog.js. Newest first.
// No sensitive fields: actor is projected to id/name/role only.

const ENTITY_TYPES = ['property', 'enquiry', 'client'];
const KNOWN_ACTIONS = [
  'property.created',
  'property.updated',
  'property.status_changed',
  'property.deleted',
  'enquiry.status_changed',
  'enquiry.converted',
  'client.status_changed',
];

const parsePage = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

export const listActivity = async (req, res) => {
  try {
    const page = parsePage(req.query.page, 1);
    const limit = Math.min(100, Math.max(1, parsePage(req.query.limit, 20)));
    const offset = (page - 1) * limit;

    const where = {};

    if (req.query.entity_type !== undefined) {
      const entityType = String(req.query.entity_type).trim().toLowerCase();
      if (!ENTITY_TYPES.includes(entityType)) {
        return res.status(400).json({ ok: false, error: `Invalid entity type. Allowed values: ${ENTITY_TYPES.join(', ')}.` });
      }
      where.entity_type = entityType;
    }

    if (req.query.action !== undefined) {
      const action = String(req.query.action).trim();
      if (!KNOWN_ACTIONS.includes(action)) {
        return res.status(400).json({ ok: false, error: `Invalid action. Allowed values: ${KNOWN_ACTIONS.join(', ')}.` });
      }
      where.action = action;
    }

    const search = String(req.query.search ?? '').trim().slice(0, 100);
    if (search) {
      where.description = { [Op.iLike]: `%${search}%` };
    }

    const startDate = parseDate(req.query.start_date);
    if (req.query.start_date !== undefined && !startDate) {
      return res.status(400).json({ ok: false, error: 'Invalid start_date. Use an ISO date or timestamp.' });
    }
    const endDate = parseDate(req.query.end_date);
    if (req.query.end_date !== undefined && !endDate) {
      return res.status(400).json({ ok: false, error: 'Invalid end_date. Use an ISO date or timestamp.' });
    }
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = startDate;
      if (endDate) where.created_at[Op.lte] = endDate;
    }

    const { count, rows } = await db.ActivityLog.findAndCountAll({
      where,
      attributes: ['id', 'action', 'entity_type', 'entity_id', 'description', 'created_at'],
      include: [
        {
          model: db.User,
          as: 'actor',
          attributes: ['id', 'name', 'role'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      ok: true,
      activities: rows.map((row) => ({
        id: row.id,
        type: row.entity_type,
        action: row.action,
        description: row.description,
        actor: row.actor ? { id: row.actor.id, name: row.actor.name, role: row.actor.role } : null,
        entity: { type: row.entity_type, id: row.entity_id },
        created_at: row.created_at,
      })),
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list activity:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve activity right now. Please try again later.' });
  }
};

export default { listActivity };
