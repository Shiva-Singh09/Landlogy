import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PropertyType = sequelize.define(
  'PropertyType',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'property_types',
    indexes: [
      { unique: true, fields: ['slug'] },
    ],
  }
);

export default PropertyType;
