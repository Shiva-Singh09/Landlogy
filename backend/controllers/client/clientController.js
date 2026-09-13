import db from '../../models/index.js';
import { safeClientProperty, UUID_RE } from '../../services/client/sellerProvisioning.js';

// ── GET /api/client/me (Seller only) ─────────────────────────────
export const getMe = async (req, res) => {
  return res.json({
    ok: true,
    user: {
      id: req.user.id, name: req.user.name, email: req.user.email,
      phone: req.user.phone, role: req.user.role, status: req.user.status,
      force_password_change: req.user.force_password_change,
    },
  });
};

// ── GET /api/client/properties (Seller only; owner derived server-side) ──
export const listProperties = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query?.limit, 10) || 20));
    const { count, rows } = await db.Property.findAndCountAll({
      where: { owner_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: limitNum, offset: (pageNum - 1) * limitNum,
    });
    return res.json({
      ok: true,
      properties: rows.map(safeClientProperty),
      pagination: { page: pageNum, limit: limitNum, total: count, totalPages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    console.error('[CLIENT] Failed to list properties:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve properties right now. Please try again later.' });
  }
};

// ── GET /api/client/properties/:id (Seller only; ownership enforced) ──
export const getProperty = async (req, res) => {
  try {
    const cid = req.params.id;
    if (!UUID_RE.test(cid)) return res.status(400).json({ ok: false, error: 'Invalid property ID format.' });
    const property = await db.Property.findOne({ where: { id: cid, owner_id: req.user.id } });
    if (!property) return res.status(404).json({ ok: false, error: 'Property not found.' });
    const images = await db.PropertyImage.findAll({
      where: { property_id: property.id }, order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });
    return res.json({
      ok: true,
      property: {
        ...safeClientProperty(property),
        images: images.map((img) => ({ id: img.id, url: img.url, caption: img.caption, is_primary: img.is_primary, sort_order: img.sort_order })),
      },
    });
  } catch (err) {
    console.error('[CLIENT] Failed to get property:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property right now. Please try again later.' });
  }
};
