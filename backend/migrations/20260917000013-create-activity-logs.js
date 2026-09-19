import { DataTypes } from 'sequelize';

// Minimal append-only activity history for the Admin "Recent Activity" panel.
// entity_id is intentionally NOT a foreign key: entity_type is polymorphic
// (property | enquiry | client) so a single FK cannot cover it, and history
// must survive deletion of the referenced entity (e.g. property.deleted).
export default {
  async up(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.createTable('activity_logs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      actor_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(300),
        allowNull: false,
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

    // Serves the only implemented query pattern: newest-first paginated listing.
    await queryInterface.addIndex('activity_logs', ['created_at'], { name: 'activity_logs_created_at_idx', ...(opts || {}) });
  },

  async down(queryInterface, Sequelize, transaction) {
    const opts = transaction ? { transaction } : undefined;
    await queryInterface.dropTable('activity_logs', opts);
  },
};
