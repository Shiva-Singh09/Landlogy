import test from 'node:test';
import assert from 'node:assert/strict';
import migration from '../migrations/20260921000018-add-property-category-id-index.js';

// Hermetic check of the additive category-index migration: asserts the up()
// adds and down() removes the exact index, with no other DDL. Uses a mock
// queryInterface — no real database is touched. Conventions match the other
// backend tests (node:test, no live DB).

function makeQi() {
  const calls = [];
  return {
    calls,
    addIndex: async (table, fields, opts) => calls.push({ op: 'addIndex', table, fields, opts }),
    removeIndex: async (table, name, opts) => calls.push({ op: 'removeIndex', table, name, opts }),
  };
}

test('up() adds the additive property_category_id index only', async () => {
  const qi = makeQi();
  await migration.up(qi, {}, undefined);
  assert.equal(qi.calls.length, 1);
  assert.deepEqual(qi.calls[0], {
    op: 'addIndex',
    table: 'properties',
    fields: ['property_category_id'],
    opts: { name: 'properties_property_category_id_idx' },
  });
});

test('down() removes the same index by name', async () => {
  const qi = makeQi();
  await migration.down(qi, {}, undefined);
  assert.equal(qi.calls.length, 1);
  assert.deepEqual(qi.calls[0], {
    op: 'removeIndex',
    table: 'properties',
    name: 'properties_property_category_id_idx',
    opts: {},
  });
});

test('up() forwards the transaction when present (rollback safety)', async () => {
  const qi = makeQi();
  const fakeTx = { id: 'tx' };
  await migration.up(qi, {}, fakeTx);
  assert.deepEqual(qi.calls[0].opts, {
    name: 'properties_property_category_id_idx',
    transaction: fakeTx,
  });
});
