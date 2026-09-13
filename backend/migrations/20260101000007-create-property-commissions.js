import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('property_commissions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      property_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      broker_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      commission_type: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage',
      },
      commission_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('property_commissions', ['property_id'], { name: 'property_commissions_property_id_idx' });
    await queryInterface.addIndex('property_commissions', ['broker_id'], { name: 'property_commissions_broker_id_idx' });
    await queryInterface.addIndex('property_commissions', ['effective_to'], { name: 'property_commissions_effective_to_idx' });
    await queryInterface.addIndex('property_commissions', ['property_id', 'is_active'], { name: 'property_commissions_property_id_is_active_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('property_commissions');
  },
};
