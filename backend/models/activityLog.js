import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Append-only activity history (written by services/common/activityLog.js).
// No sensitive data is stored: only actor, action, entity reference and a
// deterministic description string.
const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actor_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
  },
  {
    tableName: 'activity_logs',
    indexes: [
      { fields: ['created_at'] },
    ],
  }
);

export default ActivityLog;
