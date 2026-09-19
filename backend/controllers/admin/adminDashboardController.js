import db from '../../models/index.js';
import { PROPERTY_STATUSES, ENQUIRY_STATUSES } from '../../utils/constants.js';

// ── GET /api/admin/dashboard/summary (Admin only) ────────────────────
// Real DB aggregates for the Admin Dashboard. No query params in v1.
// 4 queries: grouped property counts + grouped enquiry counts +
// 5 most-recent properties + 5 most-recent enquiries (created_at DESC).
// Field projections reuse the existing admin list contracts exactly.
const TREND_RANGES = new Set([7, 30, 90]);

const parseTrendRange = (value) => {
  if (value === undefined) return 30;
  const range = Number.parseInt(String(value), 10);
  return TREND_RANGES.has(range) ? range : null;
};

const toTrend = (rows, range) => {
  const counts = new Map(rows.map((row) => [
    new Date(row.date).toISOString().slice(0, 10),
    Number.parseInt(row.count, 10) || 0,
  ]));
  const currentDay = new Date();
  currentDay.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: range }, (_, index) => {
    const day = new Date(currentDay);
    day.setUTCDate(day.getUTCDate() - (range - 1 - index));
    const date = day.toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
};

export const getDashboardSummary = async (req, res) => {
  try {
    const range = parseTrendRange(req.query.range);
    if (!range) {
      return res.status(400).json({ ok: false, error: 'Invalid range. Allowed values: 7, 30, 90.' });
    }
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (range - 1));
    const dayBucket = db.sequelize.fn('DATE_TRUNC', 'day', db.sequelize.col('created_at'));

    const [propertyGroups, enquiryGroups, recentProperties, recentEnquiries, propertyTrend, enquiryTrend] = await Promise.all([
      db.Property.findAll({
        attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      db.Enquiry.findAll({
        attributes: ['status', [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      db.Property.findAll({
        attributes: ['id', 'title', 'description', 'city', 'state', 'asking_price', 'status', 'property_type_id', 'property_category_id', 'owner_id', 'reviewed_by', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
      db.Enquiry.findAll({
        attributes: ['id', 'name', 'phone', 'email', 'city', 'intent', 'property_type', 'status', 'reviewed_by', 'notes', 'rejection_remark', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
      db.Property.findAll({
        attributes: [[dayBucket, 'date'], [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        where: { created_at: { [db.Sequelize.Op.gte]: startDate } },
        group: [dayBucket],
        order: [[dayBucket, 'ASC']],
        raw: true,
      }),
      db.Enquiry.findAll({
        attributes: [[dayBucket, 'date'], [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']],
        where: { created_at: { [db.Sequelize.Op.gte]: startDate } },
        group: [dayBucket],
        order: [[dayBucket, 'ASC']],
        raw: true,
      }),
    ]);

    // Zero-data safe: every known enum status present even when count is 0.
    const propertiesByStatus = Object.fromEntries(PROPERTY_STATUSES.map((s) => [s, 0]));
    let propertiesTotal = 0;
    for (const row of propertyGroups) {
      const n = parseInt(row.count, 10) || 0;
      if (row.status in propertiesByStatus) propertiesByStatus[row.status] = n;
      propertiesTotal += n;
    }

    const enquiriesByStatus = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]));
    let enquiriesTotal = 0;
    for (const row of enquiryGroups) {
      const n = parseInt(row.count, 10) || 0;
      if (row.status in enquiriesByStatus) enquiriesByStatus[row.status] = n;
      enquiriesTotal += n;
    }

    return res.json({
      ok: true,
      summary: {
        properties: { total: propertiesTotal, byStatus: propertiesByStatus },
        enquiries: { total: enquiriesTotal, byStatus: enquiriesByStatus },
        recent: {
          properties: recentProperties.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            city: p.city,
            state: p.state,
            asking_price: p.asking_price,
            status: p.status,
            property_type_id: p.property_type_id,
            property_category_id: p.property_category_id,
            owner_id: p.owner_id,
            reviewed_by: p.reviewed_by,
            created_at: p.created_at,
            updated_at: p.updated_at,
          })),
          enquiries: recentEnquiries.map((e) => ({
            id: e.id,
            name: e.name,
            phone: e.phone,
            email: e.email,
            city: e.city,
            intent: e.intent,
            property_type: e.property_type,
            status: e.status,
            reviewed_by: e.reviewed_by,
            notes: e.notes,
            rejection_remark: e.rejection_remark,
            created_at: e.created_at,
            updated_at: e.updated_at,
          })),
        },
        trends: {
          range,
          properties: toTrend(propertyTrend, range),
          enquiries: toTrend(enquiryTrend, range),
        },
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to get dashboard summary:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve dashboard summary right now. Please try again later.' });
  }
};
