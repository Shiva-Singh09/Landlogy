// Targeted composite indexes for the query patterns measured on the live API:
//   - properties(owner_id, created_at)       → client list (owner + created_at DESC)
//   - properties(status, created_at)         → admin list filtered by status
//   - property_images(property_id, sort_order) → image listing order
//   - enquiries(status, created_at)          → admin enquiry list by status
//   - enquiries(email)                       → admin enquiry search by email
// Additive only — no existing column or index is altered.
export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.addIndex('properties', ['owner_id', 'created_at'], { name: 'properties_owner_id_created_at_idx', ...(opts || {}) });
    await queryInterface.addIndex('properties', ['status', 'created_at'], { name: 'properties_status_created_at_idx', ...(opts || {}) });
    await queryInterface.addIndex('property_images', ['property_id', 'sort_order'], { name: 'property_images_property_id_sort_order_idx', ...(opts || {}) });
    await queryInterface.addIndex('enquiries', ['status', 'created_at'], { name: 'enquiries_status_created_at_idx', ...(opts || {}) });
    await queryInterface.addIndex('enquiries', ['email'], { name: 'enquiries_email_idx', ...(opts || {}) });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.removeIndex('properties', 'properties_owner_id_created_at_idx', opts || {});
    await queryInterface.removeIndex('properties', 'properties_status_created_at_idx', opts || {});
    await queryInterface.removeIndex('property_images', 'property_images_property_id_sort_order_idx', opts || {});
    await queryInterface.removeIndex('enquiries', 'enquiries_status_created_at_idx', opts || {});
    await queryInterface.removeIndex('enquiries', 'enquiries_email_idx', opts || {});
  },
};