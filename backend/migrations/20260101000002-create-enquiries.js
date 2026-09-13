import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('enquiries', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(160),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      intent: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      property_type: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('new', 'reviewed', 'converted', 'rejected'),
        allowNull: false,
        defaultValue: 'new',
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: {
        type: DataTypes.TEXT,
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
    });

    await queryInterface.addIndex('enquiries', ['status'], { name: 'enquiries_status_idx' });
    await queryInterface.addIndex('enquiries', ['created_at'], { name: 'enquiries_created_at_idx' });
    await queryInterface.addIndex('enquiries', ['reviewed_by'], { name: 'enquiries_reviewed_by_idx' });
    await queryInterface.addIndex('enquiries', ['phone'], { name: 'enquiries_phone_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('enquiries');
  },
};
