import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('properties', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      property_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'property_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      property_category_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'property_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      pincode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      asking_price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'under_review', 'active', 'rejected', 'inactive', 'sold', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      status_history: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('properties', ['owner_id'], { name: 'properties_owner_id_idx' });
    await queryInterface.addIndex('properties', ['status'], { name: 'properties_status_idx' });
    await queryInterface.addIndex('properties', ['city'], { name: 'properties_city_idx' });
    await queryInterface.addIndex('properties', ['property_type_id'], { name: 'properties_property_type_id_idx' });
    await queryInterface.addIndex('properties', ['created_at'], { name: 'properties_created_at_idx' });
    await queryInterface.addIndex('properties', ['asking_price'], { name: 'properties_asking_price_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('properties');
  },
};
