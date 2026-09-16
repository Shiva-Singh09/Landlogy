import jwt from 'jsonwebtoken';
import db from '../models/index.js';

// Defense-in-depth: reject the well-known dev fallback in production.
// server.js also enforces this at boot, but auth.js is imported before that
// check runs, and may be imported directly by test harnesses — so mirror the
// same rule here rather than silently using a weak secret in production.
const KNOWN_WEAK_JWT_FALLBACK = 'dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || KNOWN_WEAK_JWT_FALLBACK;
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === KNOWN_WEAK_JWT_FALLBACK)) {
  throw new Error('[AUTH] JWT_SECRET must be set to a strong secret when NODE_ENV=production; the development fallback is not allowed.');
}

// Auth middleware — every protected read passes through here, so keep the
// per-request lookup minimal: only the columns authorize()/controllers use.
// password_hash is intentionally never fetched on the hot path.
// Short-lived (60s) in-process whoami cache. A JWT is presented on EVERY
// authenticated request and the backing DB is remote (~0.4-0.5s per round
// trip), so this re-verification lookup is the single largest cost on the
// read path. Status/role are re-checked on every request by re-reading the
// cached row; user-mutating writers MUST call invalidateAuthCache(userId) so
// revocations propagate within seconds.
const AUTH_WHOAMI_TTL_MS = 60 * 1000;
const authWhoamiCache = new Map();

const getWhoami = async (userId) => {
  const key = String(userId);
  const hit = authWhoamiCache.get(key);
  if (hit && Date.now() - hit.at < AUTH_WHOAMI_TTL_MS) return hit.row;
  const row = await db.User.findByPk(userId, {
    attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'force_password_change'],
  });
  if (row) authWhoamiCache.set(key, { at: Date.now(), row });
  else authWhoamiCache.delete(key);
  return row;
};

export const invalidateAuthCache = (userId) => {
  if (userId) authWhoamiCache.delete(String(userId));
  else authWhoamiCache.clear();
};


export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // The JWT is still verified on every request; only the whoami lookup is
    // served from the 60s cache (re-checked for active status below). This
    // removes one remote DB round trip per authenticated read.
    const user = await getWhoami(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ ok: false, error: 'Invalid or inactive user.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Insufficient permissions.' });
    }
    next();
  };
};

export const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '24h' });
};
