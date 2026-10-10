// Additive index for a filter path that had no supporting index.
//   - properties(property_category_id) → admin/seller property list filtered
//     by category (adminPropertyController.listProperties applies
//     `where.property_category_id = ...`). Every other filterable FK on
//     `properties` (owner_id, property_type_id, status, city) is indexed; this
//     one was the only filter column without an index. PostgreSQL does not
//     create indexes for foreign keys automatically.
// Additive only — no existing column or index is altered.
export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.addIndex('properties', ['property_category_id'], { name: 'properties_property_category_id_idx', ...(opts || {}) });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.removeIndex('properties', 'properties_property_category_id_idx', opts || {});
  },
};
