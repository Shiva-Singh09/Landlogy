import db from '../../models/index.js';

// ── GET /api/health ──────────────────────────────────────────────
export const healthCheck = async (_, res) => {
  const health = { ok: true, database: 'unknown' };
  try {
    await db.sequelize.authenticate();
    health.database = 'connected';
  } catch (err) {
    health.database = 'disconnected';
    health.databaseError = err.message || 'Connection failed';
  }
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
};
