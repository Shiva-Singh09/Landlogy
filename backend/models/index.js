import sequelize from '../config/database.js';

import User from './user.js';
import Enquiry from './enquiry.js';
import PropertyType from './propertyType.js';
import PropertyCategory from './propertyCategory.js';
import Property from './property.js';
import PropertyImage from './propertyImage.js';
import PropertyCommission from './propertyCommission.js';
import OtpToken from './otpToken.js';
import RefreshToken from './refreshToken.js';
import ActivityLog from './activityLog.js';
import Notification from './notification.js';
import PushSubscription from './pushSubscription.js';

User.hasMany(PushSubscription, { foreignKey: 'user_id', as: 'push_subscriptions', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'recipient_user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'recipient_user_id', as: 'recipient' });

// ── Associations ────────────────────────────────────────────────

// User → Properties (owner)
User.hasMany(Property, { foreignKey: 'owner_id', as: 'properties' });
Property.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// User → Enquiries (reviewed_by)
User.hasMany(Enquiry, { foreignKey: 'reviewed_by', as: 'reviewed_enquiries' });
Enquiry.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// Enquiry → Seller account + property created at conversion (idempotency linkage)
User.hasMany(Enquiry, { foreignKey: 'converted_user_id', as: 'converted_enquiries' });
Enquiry.belongsTo(User, { foreignKey: 'converted_user_id', as: 'converted_seller' });
Enquiry.belongsTo(Property, { foreignKey: 'converted_property_id', as: 'converted_property' });

// PropertyType → Properties
PropertyType.hasMany(Property, { foreignKey: 'property_type_id', as: 'properties' });
Property.belongsTo(PropertyType, { foreignKey: 'property_type_id', as: 'property_type' });

// PropertyCategory → Properties
PropertyCategory.hasMany(Property, { foreignKey: 'property_category_id', as: 'properties' });
Property.belongsTo(PropertyCategory, { foreignKey: 'property_category_id', as: 'property_category' });

// Property → PropertyImages
Property.hasMany(PropertyImage, { foreignKey: 'property_id', as: 'images', onDelete: 'CASCADE' });
PropertyImage.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

// Property → PropertyCommissions
Property.hasMany(PropertyCommission, { foreignKey: 'property_id', as: 'commissions', onDelete: 'CASCADE' });
PropertyCommission.belongsTo(Property, { foreignKey: 'property_id', as: 'property' });

// User → PropertyCommissions (broker)
User.hasMany(PropertyCommission, { foreignKey: 'broker_id', as: 'commissions' });
PropertyCommission.belongsTo(User, { foreignKey: 'broker_id', as: 'broker' });

// User → OtpTokens
User.hasMany(OtpToken, { foreignKey: 'user_id', as: 'otp_tokens', onDelete: 'CASCADE' });
OtpToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User → RefreshTokens
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Property → User (reviewed_by)
User.hasMany(Property, { foreignKey: 'reviewed_by', as: 'reviewed_properties' });
Property.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// User → ActivityLogs (actor). SET NULL on user delete keeps history intact.
User.hasMany(ActivityLog, { foreignKey: 'actor_user_id', as: 'activity_logs', onDelete: 'SET NULL' });
ActivityLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  User,
  Enquiry,
  PropertyType,
  PropertyCategory,
  Property,
  PropertyImage,
  PropertyCommission,
  OtpToken,
  RefreshToken,
  ActivityLog,
  Notification,
  PushSubscription,
};

export default db;
