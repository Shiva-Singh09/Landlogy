import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsPayload, parseAnalyticsRange } from '../controllers/admin/adminAnalyticsController.js';
import { PROPERTY_STATUSES, ENQUIRY_STATUSES } from '../utils/constants.js';

// Synthetic DB rows (fixtures for the pure builder — not fabricated analytics).
const propertyStatusRows = PROPERTY_STATUSES.map((status, index) => ({
  status,
  in_range: index === 0 ? 3 : 1,
  lifetime: index === 0 ? 10 : 2,
}));
const enquiryStatusRows = ENQUIRY_STATUSES.map((status, index) => ({
  status,
  in_range: index === 0 ? 4 : 1,
  lifetime: index === 0 ? 20 : 5,
}));
const emptyResult = {
  propertyTotals: {},
  propertyByStatus: [],
  typeDistribution: [],
  categoryDistribution: [],
  cityDistribution: [],
  price: {},
  priceByType: [],
  listingAge: {},
  enquiryByStatus: [],
  enquiryAgeing: {},
};

describe('parseAnalyticsRange', () => {
  it('defaults to 30 and accepts only 7/30/90', () => {
    assert.equal(parseAnalyticsRange(undefined), 30);
    assert.equal(parseAnalyticsRange('7'), 7);
    assert.equal(parseAnalyticsRange('30'), 30);
    assert.equal(parseAnalyticsRange('90'), 90);
    assert.equal(parseAnalyticsRange('14'), null);
    assert.equal(parseAnalyticsRange('abc'), null);
    assert.equal(parseAnalyticsRange('-7'), null);
  });
});

describe('buildAnalyticsPayload', () => {
  it('is zero-safe on an empty aggregation result', () => {
    const payload = buildAnalyticsPayload(30, emptyResult);
    assert.equal(payload.range, 30);
    assert.equal(payload.properties.total_range, 0);
    assert.equal(payload.properties.total_lifetime, 0);
    assert.equal(payload.enquiries.total_range, 0);
    assert.equal(payload.enquiries.conversion_rate_range, null);
    assert.equal(payload.enquiries.rejection_rate_range, null);
    assert.equal(payload.properties.price.average, null);
    assert.equal(payload.enquiries.ageing.average_handling_days, null);
  });

  it('sums range/lifetime counts, rates and price bands from DB rows', () => {
    const payload = buildAnalyticsPayload(7, {
      ...emptyResult,
      propertyTotals: { lifetime: 20, in_range: 8, cities_in_range: 3 },
      propertyByStatus: propertyStatusRows,
      enquiryByStatus: enquiryStatusRows,
      price: { with_price: 6, without_price: 2, average: '1250000.50', band_25l: 1, band_50l: 2, band_1cr: 2, band_2cr: 1, band_2cr_plus: 0 },
      priceByType: [{ label: 'Plot', count: 4, average: '900000' }],
      listingAge: { b_30: 2, b_60: 1, b_90: 1, b_90_plus: 0 },
      enquiryAgeing: { u_2: 3, u_7: 2, u_14: 1, u_14_plus: 0, unresolved_total: 6, avg_handling: '2.5', handled_count: 10 },
    });
    // Range totals come from the per-status sums.
    const propertyRangeTotal = payload.properties.total_range;
    const enquiryRangeTotal = payload.enquiries.total_range;
    assert.equal(propertyRangeTotal, propertyStatusRows.reduce((sum, row) => sum + row.in_range, 0));
    assert.equal(enquiryRangeTotal, enquiryStatusRows.reduce((sum, row) => sum + row.in_range, 0));
    assert.equal(payload.properties.distinct_cities, 3);
    // Every enum status is always present (zero-safe shape).
    PROPERTY_STATUSES.forEach((status) => {
      assert.equal(payload.properties.byStatus[status].in_range, propertyStatusRows.find((row) => row.status === status).in_range);
      assert.equal(payload.properties.byStatus[status].lifetime, propertyStatusRows.find((row) => row.status === status).lifetime);
    });
    // Rates are rounded to one decimal.
    const converted = payload.enquiries.byStatus.converted.in_range;
    assert.equal(payload.enquiries.conversion_rate_range, Math.round((converted / enquiryRangeTotal) * 1000) / 10);
    // DECIMAL aggregates arrive as strings and must be numbers in the payload.
    assert.equal(payload.properties.price.average, 1250000.5);
    assert.equal(payload.properties.price_by_type[0].average, 900000);
    assert.equal(payload.properties.price.bands.reduce((sum, band) => sum + band.count, 0), 6);
    assert.equal(payload.properties.listing_age.total, 4);
    assert.equal(payload.enquiries.ageing.unresolved_total, 6);
    assert.equal(payload.enquiries.ageing.average_handling_days, 2.5);
    assert.equal(payload.enquiries.ageing.handled_count, 10);
  });
});
