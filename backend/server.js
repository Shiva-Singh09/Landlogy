import 'dotenv/config';
import express from 'express';
import db from './models/index.js';
import { applySecurityMiddleware, applyApiErrorHandlers } from './middleware/security.js';
import { poolConfig } from './config/database.js';
import { authenticate, authorize } from './middleware/auth.js';
import commonRoutes from './routes/common/index.js';
import adminRoutes from './routes/admin/index.js';
import clientRoutes from './routes/client/index.js';

// Production safety: never boot with the development JWT secret fallback.
// Two checks:
//   1. JWT_SECRET must be set (non-empty) when NODE_ENV=production.
//   2. The well-known dev-fallback value is rejected even if somehow "set",
//      because it is a predictable, low-entropy secret unsuitable for production.
const KNOWN_WEAK_JWT_FALLBACK = 'dev-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === KNOWN_WEAK_JWT_FALLBACK)) {
  throw new Error('[BOOT] JWT_SECRET must be set to a strong secret when NODE_ENV=production; the development fallback is not allowed.');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Cross-cutting middleware (CORS, JSON body limit, static uploads, global rate limiting).
app.set('trust proxy', 1);
applySecurityMiddleware(app);

// Route composition — one mount point per application surface.
app.use('/api', commonRoutes);        // shared: health, auth, public enquiries
app.use('/api/admin', adminRoutes);   // Admin-only (authorize('admin') per route)
app.use('/api/client', clientRoutes); // Seller/Client-only (authorize('seller') per route)

// Legacy admin-only create path (original contract: POST /api/properties) delegates
// to the admin router so ownership/validation rules stay in one place.
app.post('/api/properties', authenticate, authorize('admin'), (req, _res, next) => { req.url = '/properties'; next(); }, adminRoutes);

// Registered after every route: unmatched /api paths, malformed JSON bodies and
// unexpected errors all return JSON instead of an unparseable HTML/text page.
applyApiErrorHandlers(app);

app.listen(PORT,'0.0.0.0', async () => {
  console.log(`LANDLOGY API running on http://localhost:${PORT}`);
  try {
    await db.sequelize.authenticate();
    console.log('[DB] PostgreSQL connection established successfully.');
    // Warm the pool to DB_POOL_MIN live connections (default 2). Every LIST
    // endpoint runs COUNT + SELECT concurrently (Sequelize findAndCountAll), so
    // the first such request would otherwise pay one extra remote round trip
    // (~0.4s measured against the Supabase pooler) just to open the 2nd socket.
    try {
      const warmCount = Math.max(1, poolConfig.min);
      await Promise.all(Array.from({ length: warmCount }, () => db.sequelize.query('SELECT 1')));
      console.log(`[DB] Connection pool warmed (${warmCount} connection(s)).`);
    } catch (warmErr) {
      console.error('[DB] Pool warmup query failed:', warmErr?.message || warmErr);
    }
  } catch (err) {
    console.error('[DB] Unable to connect to PostgreSQL:', err.message);
    console.error('[DB] The server will continue running, but database operations will fail.');
    console.error('[DB] Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in .env and run migrations.');
  }
});
