import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PropertyImage = sequelize.define(
  'PropertyImage',
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
  },
  {
    tableName: 'property_images',
    indexes: [
      { fields: ['property_id'] },
      { fields: ['is_primary'] },
      { fields: ['property_id', 'is_primary'] },
    ],
  }
);

export default PropertyImage;
