import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export default sequelize.define('PushSubscription', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  endpoint: { type: DataTypes.TEXT, allowNull: false },
  endpoint_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  p256dh: { type: DataTypes.STRING(100), allowNull: false },
  auth: { type: DataTypes.STRING(30), allowNull: false },
  silent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'push_subscriptions', underscored: true });
