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
  NODE_ENV = 'development',
} = process.env;

const sslEnabled = DB_SSL === 'true' || NODE_ENV === 'production';

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
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 30000,
    evict: 10000,
    // Keep warm connections alive (Supabase remote DB). Eviction every 15s
    // would otherwise sweep an idle min connection and force a ~9s TLS
    // handshake onto the next request.
  },
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
