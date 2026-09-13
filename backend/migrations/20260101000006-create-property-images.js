import { DataTypes } from 'sequelize';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('property_images', {
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
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('property_images', ['property_id'], { name: 'property_images_property_id_idx' });
    await queryInterface.addIndex('property_images', ['is_primary'], { name: 'property_images_is_primary_idx' });
    await queryInterface.addIndex('property_images', ['property_id', 'is_primary'], { name: 'property_images_property_id_is_primary_idx' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('property_images');
  },
};
