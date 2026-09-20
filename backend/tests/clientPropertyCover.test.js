import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../models/index.js';
import { listProperties } from '../controllers/client/clientController.js';

// Focused coverage for the COVER image resolution added to the seller
// property LIST endpoint (clientController.listProperties). Conventions match
// the other controller tests: node:test + t.mock.method on the db singleton —
// no real database is touched.

const seller = '11111111-1111-4111-8111-111111111111';

function makeRow(id, created_at) {
  // Minimal stand-in for a Property instance — safeClientProperty reads plain
  // fields only (sellerProvisioning.js), so a plain object is sufficient.
  return { id, owner_id: seller, title: `P ${id}`, status: 'pending', created_at, updated_at: created_at };
}

function makeImage(property_id, url, { is_primary = false, sort_order = 0, created_at = '2026-01-01T00:00:00Z', id = `${property_id}-${url}` } = {}) {
  return { id, property_id, url, is_primary, sort_order, created_at };
}

function response() {
  // Mirrors Express: a handler that never calls res.status() responds with the
  // default 200 — same convention as the other controller tests.
  return {
    code: 200, body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('property with a primary image → primary_image is that URL', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async () => ({
    count: 1, rows: [makeRow('p1', '2026-01-02T00:00:00Z')],
  }));
  t.mock.method(db.PropertyImage, 'findAll', async (options) => {
    assert.deepEqual(options.where, { property_id: ['p1'] });
    assert.deepEqual(options.order, [['sort_order', 'ASC'], ['created_at', 'ASC'], ['id', 'ASC']]);
    return [
      makeImage('p1', '/uploads/secondary.jpg', { sort_order: 0 }),
      makeImage('p1', '/uploads/cover.jpg', { is_primary: true, sort_order: 2 }),
    ];
  });

  const res = response();
  await listProperties({ user: { id: seller }, query: {} }, res);

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.properties[0].primary_image, '/uploads/cover.jpg');
  // One batched image query for the whole page — never per-row.
  assert.equal(db.PropertyImage.findAll.mock.callCount(), 1);
});

test('multiple images, no primary → deterministic fallback (lowest sort_order)', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async () => ({
    count: 1, rows: [makeRow('p2', '2026-01-02T00:00:00Z')],
  }));
  // Rows arrive exactly as the DB returns them: sorted by sort_order ASC
  // (the order clause pinned in the first test). first.jpg (sort_order 1)
  // therefore arrives before late.jpg (sort_order 5) and wins the fallback.
  t.mock.method(db.PropertyImage, 'findAll', async () => [
    makeImage('p2', '/uploads/first.jpg', { sort_order: 1 }),
    makeImage('p2', '/uploads/late.jpg', { sort_order: 5 }),
  ]);

  const res = response();
  await listProperties({ user: { id: seller }, query: {} }, res);
  assert.equal(res.body.properties[0].primary_image, '/uploads/first.jpg');
});

test('multiple is_primary rows → first row in deterministic order wins', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async () => ({
    count: 1, rows: [makeRow('p3', '2026-01-02T00:00:00Z')],
  }));
  t.mock.method(db.PropertyImage, 'findAll', async () => [
    makeImage('p3', '/uploads/primary-a.jpg', { is_primary: true, sort_order: 1 }),
    makeImage('p3', '/uploads/primary-b.jpg', { is_primary: true, sort_order: 3 }),
  ]);

  const res = response();
  await listProperties({ user: { id: seller }, query: {} }, res);
  assert.equal(res.body.properties[0].primary_image, '/uploads/primary-a.jpg');
});

test('no images → primary_image: null', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async () => ({
    count: 1, rows: [makeRow('p4', '2026-01-02T00:00:00Z')],
  }));
  t.mock.method(db.PropertyImage, 'findAll', async () => []);

  const res = response();
  await listProperties({ user: { id: seller }, query: {} }, res);
  assert.equal(res.body.properties[0].primary_image, null);
});

test('response shape unchanged apart from primary_image (pagination intact)', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async (options) => {
    assert.equal(options.limit, 10);
    assert.equal(options.offset, 10);
    assert.deepEqual(options.order, [['created_at', 'DESC']]);
    assert.deepEqual(options.where, { owner_id: seller });
    return {
      count: 2,
      rows: [makeRow('p6', '2026-01-03T00:00:00Z'), makeRow('p5', '2026-01-01T00:00:00Z')],
    };
  });
  t.mock.method(db.PropertyImage, 'findAll', async () => [
    makeImage('p5', '/uploads/a.jpg', { sort_order: 0 }),
  ]);

  const res = response();
  await listProperties({ user: { id: seller }, query: { page: '2', limit: '10' } }, res);

  assert.equal(res.code, 200);
  assert.deepEqual(Object.keys(res.body), ['ok', 'properties', 'pagination']);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 10, total: 2, totalPages: 1 });
  assert.equal(res.body.properties[0].primary_image, null);
  assert.equal(res.body.properties[1].primary_image, '/uploads/a.jpg');
});

test('empty page → no image query issued', async (t) => {
  t.mock.method(db.Property, 'findAndCountAll', async () => ({ count: 0, rows: [] }));
  const imageMock = t.mock.method(db.PropertyImage, 'findAll', async () => []);

  const res = response();
  await listProperties({ user: { id: seller }, query: {} }, res);

  assert.equal(res.body.ok, true);
  assert.equal(res.body.properties.length, 0);
  assert.equal(imageMock.mock.callCount(), 0);
});