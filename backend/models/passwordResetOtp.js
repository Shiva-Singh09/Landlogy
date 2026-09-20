import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PasswordResetOtp = sequelize.define(
  'PasswordResetOtp',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'password_reset_otps',
    indexes: [
      { fields: ['email'] },
      { fields: ['user_id'] },
      { fields: ['expires_at'] },
      { fields: ['consumed_at'] },
      { fields: ['email', 'consumed_at', 'expires_at'] },
    ],
  }
);

export default PasswordResetOtp;
