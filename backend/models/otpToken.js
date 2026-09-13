import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtpToken = sequelize.define(
  'OtpToken',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    otp_code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    purpose: {
      type: DataTypes.ENUM('login', 'password_reset', 'email_verification', 'phone_verification'),
      allowNull: false,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'otp_tokens',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['purpose'] },
      { fields: ['is_used'] },
      { fields: ['expires_at'] },
      { fields: ['user_id', 'purpose', 'is_used'] },
    ],
  }
);

export default OtpToken;
