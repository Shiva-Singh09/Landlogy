import db from '../../models/index.js';

// ── GET /api/health ──────────────────────────────────────────────
// Public liveness/readiness probe (no auth). It reports only aggregate
// status. The raw database error — which can contain host names, driver
// details or other internal information — is logged server-side for
// operators and is NEVER returned in the public response body.
export const healthCheck = async (_, res) => {
  const health = { ok: true, database: 'unknown' };
  try {
    await db.sequelize.authenticate();
    health.database = 'connected';
  } catch (err) {
    // Full detail stays in the server logs; the client sees only a generic state.
    console.error('[HEALTH] Database connection failed:', err?.message || err);
    health.ok = false;
    health.database = 'disconnected';
  }
  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
};
