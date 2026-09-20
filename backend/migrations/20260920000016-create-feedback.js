import { DataTypes } from 'sequelize';

// Dedicated product-feedback storage for the public Seller Landing Page form.
// Deliberately separate from `enquiries`: feedback is product input, not a sales
// lead, so it never enters the Admin enquiry workflow, counts or trends and the
// existing `enquiries` table is left completely untouched.
export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.createTable('feedback', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      rating: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    }, opts);

    // Serves the only implemented query patterns: newest-first listing and
    // later rating-based grouping.
    await queryInterface.addIndex('feedback', ['created_at'], { name: 'feedback_created_at_idx', ...(opts || {}) });
    await queryInterface.addIndex('feedback', ['rating'], { name: 'feedback_rating_idx', ...(opts || {}) });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.dropTable('feedback', opts);
  },
};
