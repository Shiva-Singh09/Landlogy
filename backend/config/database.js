import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'landlogy',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_SSL = 'false',
  DB_POOL_MAX = '10',
  DB_POOL_MIN = '2',
  DB_POOL_ACQUIRE = '30000',
  DB_POOL_IDLE = '30000',
  DB_POOL_EVICT = '10000',
  NODE_ENV = 'development',
} = process.env;

const sslEnabled = DB_SSL === 'true' || NODE_ENV === 'production';

// Safe numeric parsing for pool sizing: an empty/invalid .env value falls back
// to the current defaults instead of producing NaN/0 (which would break the
// pool). Pool values stay environment-driven so they can be tuned for a
// different DB plan/region without editing source.
const positiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const poolConfig = (() => {
  const max = Math.max(1, positiveInt(DB_POOL_MAX, 10));
  // Keep at least one connection alive even if DB_POOL_MIN is unset to 0:
  // the remote DB's TLS handshake is the single most expensive thing a cold
  // request can hit, and a warm socket removes it entirely.
  const min = Math.max(1, Math.min(positiveInt(DB_POOL_MIN, 2), max));
  return {
    max,
    min,
    acquire: positiveInt(DB_POOL_ACQUIRE, 30000),
    idle: positiveInt(DB_POOL_IDLE, 30000),
    evict: positiveInt(DB_POOL_EVICT, 10000),
  };
})();

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: poolConfig,
  keepDefaultTimezone: true,
  dialectOptions: sslEnabled
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
        // Recycle warm sockets to the remote DB instead of tearing down TLS.
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      }
    : {},
});

export default sequelize;
