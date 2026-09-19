import db from '../../models/index.js';
import { QueryTypes } from 'sequelize';
import { PROPERTY_STATUSES, ENQUIRY_STATUSES } from '../../utils/constants.js';

// ── GET /api/admin/analytics (Admin only) ────────────────────────────
// Range-complete analytics aggregated directly in PostgreSQL for the selected
// 7/30/90-day window. Every metric is computed with SQL GROUP BY / FILTER —
// no full-table scans into Node memory, no client-side sampling.
// Reuses the dashboard's range parsing conventions (7/30/90, default 30).

const RANGES = new Set([7, 30, 90]);

export const parseAnalyticsRange = (value) => {
  if (value === undefined) return 30;
  const range = Number.parseInt(String(value), 10);
  return RANGES.has(range) ? range : null;
};

const toCount = (value) => (value === null || value === undefined ? 0 : Number(value) || 0);
const toCountRows = (rows) => rows.map((row) => ({ label: String(row.label), count: toCount(row.count) }));
const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};
const toRate = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);

const PROPERTY_SQL = {
  totals: `
    SELECT COUNT(*) AS lifetime,
      COUNT(*) FILTER (WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')) AS in_range,
      COUNT(DISTINCT city) FILTER (WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')) AS cities_in_range
    FROM properties`,
  byStatus: `
    SELECT status,
      COUNT(*) FILTER (WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')) AS in_range,
      COUNT(*) AS lifetime
    FROM properties GROUP BY status`,
  typeDistribution: `
    SELECT COALESCE(pt.name, 'Unspecified') AS label, COUNT(*) AS count
    FROM properties p LEFT JOIN property_types pt ON pt.id = p.property_type_id
    WHERE p.created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')
    GROUP BY 1 ORDER BY count DESC, label ASC LIMIT 10`,
  categoryDistribution: `
    SELECT COALESCE(pc.name, 'Unspecified') AS label, COUNT(*) AS count
    FROM properties p LEFT JOIN property_categories pc ON pc.id = p.property_category_id
    WHERE p.created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')
    GROUP BY 1 ORDER BY count DESC, label ASC LIMIT 10`,
  cityDistribution: `
    SELECT city AS label, COUNT(*) AS count
    FROM properties
    WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day') AND city IS NOT NULL AND btrim(city) <> ''
    GROUP BY city ORDER BY count DESC, label ASC LIMIT 10`,
  price: `
    SELECT
      COUNT(*) FILTER (WHERE asking_price IS NOT NULL AND asking_price > 0) AS with_price,
      COUNT(*) FILTER (WHERE asking_price IS NULL OR asking_price <= 0) AS without_price,
      AVG(asking_price) FILTER (WHERE asking_price > 0) AS average,
      COUNT(*) FILTER (WHERE asking_price > 0 AND asking_price < 2500000) AS band_25l,
      COUNT(*) FILTER (WHERE asking_price >= 2500000 AND asking_price < 5000000) AS band_50l,
      COUNT(*) FILTER (WHERE asking_price >= 5000000 AND asking_price < 10000000) AS band_1cr,
      COUNT(*) FILTER (WHERE asking_price >= 10000000 AND asking_price < 20000000) AS band_2cr,
      COUNT(*) FILTER (WHERE asking_price >= 20000000) AS band_2cr_plus
    FROM properties
    WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')`,
  priceByType: `
    SELECT COALESCE(pt.name, 'Unspecified') AS label, COUNT(*) AS count,
      AVG(p.asking_price) FILTER (WHERE p.asking_price > 0) AS average
    FROM properties p LEFT JOIN property_types pt ON pt.id = p.property_type_id
    WHERE p.created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')
    GROUP BY 1 ORDER BY count DESC, label ASC LIMIT 10`,
  listingAge: `
    SELECT
      COUNT(*) FILTER (WHERE age <= 30) AS b_30,
      COUNT(*) FILTER (WHERE age > 30 AND age <= 60) AS b_60,
      COUNT(*) FILTER (WHERE age > 60 AND age <= 90) AS b_90,
      COUNT(*) FILTER (WHERE age > 90) AS b_90_plus
    FROM (
      SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age
      FROM properties
      WHERE status IN ('draft', 'under_review', 'active', 'inactive')
        AND created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')
    ) t`,
};

const ENQUIRY_SQL = {
  byStatus: `
    SELECT status,
      COUNT(*) FILTER (WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')) AS in_range,
      COUNT(*) AS lifetime
    FROM enquiries GROUP BY status`,
  ageing: `
    SELECT
      COUNT(*) FILTER (WHERE status IN ('new', 'reviewed') AND age <= 2) AS u_2,
      COUNT(*) FILTER (WHERE status IN ('new', 'reviewed') AND age > 2 AND age <= 7) AS u_7,
      COUNT(*) FILTER (WHERE status IN ('new', 'reviewed') AND age > 7 AND age <= 14) AS u_14,
      COUNT(*) FILTER (WHERE status IN ('new', 'reviewed') AND age > 14) AS u_14_plus,
      COUNT(*) FILTER (WHERE status IN ('new', 'reviewed')) AS unresolved_total,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
        FILTER (WHERE status IN ('reviewed', 'converted', 'rejected')
          AND updated_at IS NOT NULL AND updated_at >= created_at) AS avg_handling,
      COUNT(*) FILTER (WHERE status IN ('reviewed', 'converted', 'rejected')
          AND updated_at IS NOT NULL AND updated_at >= created_at) AS handled_count
    FROM (
      SELECT status,
        created_at,
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS age
      FROM enquiries
      WHERE created_at >= NOW() - (CAST(:range AS INT) * INTERVAL '1 day')
    ) t`,
};

/**
 * Pure response builder — no I/O, fully unit-testable (matches the dashboard
 * controller's zero-data-safe convention: every enum status is always present).
 */
export const buildAnalyticsPayload = (range, {
  propertyTotals,
  propertyByStatus,
  typeDistribution,
  categoryDistribution,
  cityDistribution,
  price,
  priceByType,
  listingAge,
  enquiryByStatus,
  enquiryAgeing,
}) => {
  const statusCounts = (rows, statuses) => {
    const counts = Object.fromEntries(statuses.map((status) => [status, { in_range: 0, lifetime: 0 }]));
    rows.forEach((row) => {
      if (row.status in counts) counts[row.status] = { in_range: toCount(row.in_range), lifetime: toCount(row.lifetime) };
    });
    return counts;
  };
  const propertiesByStatus = statusCounts(propertyByStatus, PROPERTY_STATUSES);
  const enquiriesByStatus = statusCounts(enquiryByStatus, ENQUIRY_STATUSES);
  const sumRange = (statuses, counts) => statuses.reduce((sum, status) => sum + counts[status].in_range, 0);
  const sumLifetime = (statuses, counts) => statuses.reduce((sum, status) => sum + counts[status].lifetime, 0);
  const propertiesInRange = sumRange(PROPERTY_STATUSES, propertiesByStatus);
  const propertiesLifetime = sumLifetime(PROPERTY_STATUSES, propertiesByStatus);
  const enquiriesInRange = sumRange(ENQUIRY_STATUSES, enquiriesByStatus);
  const enquiriesLifetime = sumLifetime(ENQUIRY_STATUSES, enquiriesByStatus);
  return {
    range,
    properties: {
      total_range: propertiesInRange,
      total_lifetime: propertiesLifetime,
      byStatus: propertiesByStatus,
      type_distribution: toCountRows(typeDistribution),
      category_distribution: toCountRows(categoryDistribution),
      city_distribution: toCountRows(cityDistribution),
      distinct_cities: toCount(propertyTotals.cities_in_range),
      price: {
        with_price: toCount(price.with_price),
        without_price: toCount(price.without_price),
        average: toNumberOrNull(price.average),
        bands: [
          { label: 'Under ₹25 L', count: toCount(price.band_25l) },
          { label: '₹25 L – ₹50 L', count: toCount(price.band_50l) },
          { label: '₹50 L – ₹1 Cr', count: toCount(price.band_1cr) },
          { label: '₹1 Cr – ₹2 Cr', count: toCount(price.band_2cr) },
          { label: '₹2 Cr & above', count: toCount(price.band_2cr_plus) },
        ],
      },
      price_by_type: priceByType.map((row) => ({
        label: String(row.label),
        count: toCount(row.count),
        average: toNumberOrNull(row.average),
      })),
      listing_age: {
        buckets: [
          { label: '0–30 days', count: toCount(listingAge.b_30) },
          { label: '31–60 days', count: toCount(listingAge.b_60) },
          { label: '61–90 days', count: toCount(listingAge.b_90) },
          { label: 'Over 90 days', count: toCount(listingAge.b_90_plus) },
        ],
        total: toCount(listingAge.b_30) + toCount(listingAge.b_60) + toCount(listingAge.b_90) + toCount(listingAge.b_90_plus),
      },
    },
    enquiries: {
      total_range: enquiriesInRange,
      total_lifetime: enquiriesLifetime,
      byStatus: enquiriesByStatus,
      conversion_rate_range: toRate(enquiriesByStatus.converted.in_range, enquiriesInRange),
      conversion_rate_lifetime: toRate(enquiriesByStatus.converted.lifetime, enquiriesLifetime),
      rejection_rate_range: toRate(enquiriesByStatus.rejected.in_range, enquiriesInRange),
      rejection_rate_lifetime: toRate(enquiriesByStatus.rejected.lifetime, enquiriesLifetime),
      ageing: {
        buckets: [
          { label: '0–2 days', count: toCount(enquiryAgeing.u_2) },
          { label: '3–7 days', count: toCount(enquiryAgeing.u_7) },
          { label: '8–14 days', count: toCount(enquiryAgeing.u_14) },
          { label: 'Over 14 days', count: toCount(enquiryAgeing.u_14_plus) },
        ],
        unresolved_total: toCount(enquiryAgeing.unresolved_total),
        average_handling_days: toNumberOrNull(enquiryAgeing.avg_handling),
        handled_count: toCount(enquiryAgeing.handled_count),
      },
    },
  };
};

/** Runs every aggregation as one parallel batch of DB-level GROUP BY queries. */
const runAggregations = async (range) => {
  const replacements = { range };
  const run = (sql) => db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
  const [
    propertyTotals,
    propertyByStatus,
    typeDistribution,
    categoryDistribution,
    cityDistribution,
    price,
    priceByType,
    listingAge,
    enquiryByStatus,
    enquiryAgeing,
  ] = await Promise.all([
    run(PROPERTY_SQL.totals),
    run(PROPERTY_SQL.byStatus),
    run(PROPERTY_SQL.typeDistribution),
    run(PROPERTY_SQL.categoryDistribution),
    run(PROPERTY_SQL.cityDistribution),
    run(PROPERTY_SQL.price),
    run(PROPERTY_SQL.priceByType),
    run(PROPERTY_SQL.listingAge),
    run(ENQUIRY_SQL.byStatus),
    run(ENQUIRY_SQL.ageing),
  ]);
  return {
    propertyTotals: propertyTotals[0] ?? {},
    propertyByStatus,
    typeDistribution,
    categoryDistribution,
    cityDistribution,
    price: price[0] ?? {},
    priceByType,
    listingAge: listingAge[0] ?? {},
    enquiryByStatus,
    enquiryAgeing: enquiryAgeing[0] ?? {},
  };
};

// ── GET /api/admin/analytics (Admin only) ─────────────────────────────
export const getAnalytics = async (req, res) => {
  try {
    const range = parseAnalyticsRange(req.query.range);
    if (!range) {
      return res.status(400).json({ ok: false, error: 'Invalid range. Allowed values: 7, 30, 90.' });
    }
    const result = await runAggregations(range);
    return res.json({ ok: true, analytics: buildAnalyticsPayload(range, result) });
  } catch (err) {
    console.error('[ANALYTICS] aggregation failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve analytics right now. Please try again later.' });
  }
};
