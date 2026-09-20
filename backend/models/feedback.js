import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Product feedback collected from the public Seller Landing Page. Intentionally
// isolated from `enquiries`: no status, no review/conversion linkage, no broker
// or commission fields and no notification fields — feedback is never a lead.
const Feedback = sequelize.define(
  'Feedback',
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
    email: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    rating: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
  },
  {
    tableName: 'feedback',
    underscored: true,
    indexes: [
      { fields: ['created_at'] },
      { fields: ['rating'] },
    ],
  }
);

export default Feedback;
