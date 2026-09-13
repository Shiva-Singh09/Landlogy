import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PropertyCommission = sequelize.define(
  'PropertyCommission',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    property_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    broker_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
      defaultValue: DataTypes.NOW,
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
  },
  {
    tableName: 'property_commissions',
    indexes: [
      { fields: ['property_id'] },
      { fields: ['broker_id'] },
      { fields: ['effective_to'] },
      { fields: ['property_id', 'is_active'] },
    ],
  }
);

export default PropertyCommission;
