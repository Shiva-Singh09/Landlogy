import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Property = sequelize.define(
  'Property',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    property_type_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    property_category_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    },
  },
  {
    tableName: 'properties',
    indexes: [
      { fields: ['owner_id'] },
      { fields: ['status'] },
      { fields: ['city'] },
      { fields: ['property_type_id'] },
      { fields: ['created_at'] },
      { fields: ['asking_price'] },
      { fields: ['owner_id', 'created_at'] },
      { fields: ['status', 'created_at'] },
    ],
  }
);

export default Property;
