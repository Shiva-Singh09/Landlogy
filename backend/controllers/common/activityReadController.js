import { ACTIVITY_ACTIONS } from '../../services/common/activityLog.js';
import db from '../../models/index.js';

export const listActivity = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      search,
      start_date,
      end_date,
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (type) {
      if (!ACTIVITY_ACTIONS[type]) {
        return res.status(400).json({
          ok: false,
          error: `Invalid activity type. Allowed values: ${Object.values(ACTIVITY_ACTIONS).join(', ')}.`,
        });
      }
      where.action = type;
    }

    if (search && String(search).trim()) {
      const searchTerm = String(search).trim();
      where.description = { [db.Sequelize.Op.iLike]: `%${searchTerm}%` };
    }

    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) {
        where.createdAt[db.Sequelize.Op.gte] = start_date;
      }
      if (end_date) {
        where.createdAt[db.Sequelize.Op.lte] = end_date;
      }
    }

    const { count, rows } = await db.ActivityLog.findAndCountAll({
      where,
      attributes: ['id', 'actor_user_id', 'action', 'entity_type', 'entity_id', 'description', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    const activities = rows.map((r) => ({
      id: r.id,
      type: r.action,
      action: r.action,
      description: r.description,
      actor: { id: r.actor_user_id, name: r.actor_user_id, role: 'admin', createdAt: r.created_at },
      entity: { type: r.entity_type, id: r.entity_id, createdAt: r.entity_id },
      createdAt: r.created_at,
      updatedAt: r.created_at,
    }));

    return res.json({
      ok: true,
      activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list activity:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve activity right now. Please try again later.' });
  }
};
