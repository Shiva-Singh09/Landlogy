import db from '../../models/index.js';

// ── Admin Property Reference Data (read-only) ────────────────────
// Powers Admin frontend Select/Dropdown controls. Only active records
// (is_active=true) are exposed. No pagination — small static tables.

const TYPE_ATTRIBUTES = ['id', 'name', 'slug', 'description', 'is_active'];
const CATEGORY_ATTRIBUTES = ['id', 'name', 'slug', 'description', 'is_active'];

// GET /api/admin/property-types (Admin only)
export const listPropertyTypes = async (_req, res) => {
  try {
    const rows = await db.PropertyType.findAll({
      where: { is_active: true },
      attributes: TYPE_ATTRIBUTES,
      order: [['name', 'ASC']],
    });
    return res.json({
      ok: true,
      propertyTypes: rows.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        is_active: t.is_active,
      })),
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list property types:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property types right now. Please try again later.' });
  }
};

// GET /api/admin/property-categories (Admin only)
export const listPropertyCategories = async (_req, res) => {
  try {
    const rows = await db.PropertyCategory.findAll({
      where: { is_active: true },
      attributes: CATEGORY_ATTRIBUTES,
      order: [['name', 'ASC']],
    });
    return res.json({
      ok: true,
      propertyCategories: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        is_active: c.is_active,
      })),
    });
  } catch (err) {
    console.error('[ADMIN] Failed to list property categories:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve property categories right now. Please try again later.' });
  }
};
