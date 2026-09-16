import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Enquiry = sequelize.define(
  'Enquiry',
  {
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
    },
    converted_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    converted_property_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rejection_remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'enquiries',
    indexes: [
      { fields: ['status'] },
      { fields: ['created_at'] },
      { fields: ['reviewed_by'] },
      { fields: ['phone'] },
      { fields: ['status', 'created_at'] },
      { fields: ['email'] },
    ],
  }
);

export default Enquiry;
