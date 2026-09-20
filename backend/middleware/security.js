import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { UPLOAD_DIR } from '../config/upload.js';

// Single JSON failure shape for cross-cutting middleware. The client always
// calls res.json(), so any plain-text/HTML default response (rate-limit page,
// 404 page, body-parser HTML) surfaces to users as
// "Unexpected token 'T', ... is not valid JSON".
export const jsonError = (res, status, error) => res.status(status).json({ ok: false, error });

export const RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

// The /api limiter is the only limiter in the backend (there is no separate
// login limiter and no expensive-endpoint limiter). Its counter lives in the
// library's default in-memory store, keyed by the client IP (req.ip) — so it
// is IP-based, not account-based, and it is wiped whenever the process restarts.
// Configured via RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX so the limit can be
// changed through .env without touching source code.
const parsePositiveInt = (value, fallback) => {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};
export const API_RATE_LIMIT_MAX = parsePositiveInt(process.env.RATE_LIMIT_MAX, 40);
export const API_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60000);

export const FORGOT_PASSWORD_RATE_LIMIT_MAX = parsePositiveInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX, 5);
export const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);

// Loopback-only exemption for local development. Without it, a dev session
// (page reloads, repeated logins, scripts) exhausts the request window and
// locks the developer out of /api/auth/login with a 429 until the window
// elapses, while the only cure is waiting it out or restarting the process.
//
// Safety: the exemption requires an EXPLICIT NODE_ENV === 'development' AND a
// loopback peer address. Anything else (production, test, unset NODE_ENV) keeps
// the configured limit, so a misconfigured deploy can never end up with the
// limiter disabled. Non-loopback clients are never exempt.
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const isLocalDevRequest = (req) =>
  process.env.NODE_ENV === 'development' && LOOPBACK_IPS.has(String(req.ip || ''));

export const forgotPasswordLimiter = rateLimit({
  windowMs: FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
  max: FORGOT_PASSWORD_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  skip: isLocalDevRequest,
  handler: (_req, res) => jsonError(res, 429, 'Too many password reset attempts. Please try again later.'),
});

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

const isExactHttpOrigin = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
};

export const getCorsOrigins = (environment = process.env.NODE_ENV) => {
  const configured = String(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.some((origin) => !isExactHttpOrigin(origin))) {
    throw new Error('[CORS] CLIENT_ORIGIN must contain comma-separated exact http(s) origins.');
  }

  if (environment === 'production' && configured.length === 0) {
    throw new Error('[CORS] CLIENT_ORIGIN must be configured in production.');
  }

  return environment === 'production'
    ? configured
    : [...new Set([...DEVELOPMENT_ORIGINS, ...configured])];
};

// Cross-cutting app middleware — single source of truth for CORS, body limits,
// static uploads serving and global rate limiting.
export const applySecurityMiddleware = (app) => {
  const allowedOrigins = new Set(getCorsOrigins());
  app.use(cors({
    origin(origin, callback) {
      // Non-browser requests (health checks, server-to-server calls) have no
      // Origin header and do not need CORS headers. Browser origins are always
      // checked against the explicit allow-list.
      if (!origin) return callback(null, true);
      return callback(null, allowedOrigins.has(origin));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({limit:'32kb'}));
  app.use('/uploads', express.static(UPLOAD_DIR));
  // Only the rejection body is overridden: express-rate-limit's default handler
  // sends plain text, which is not parseable JSON. res.json() also sets
  // Content-Type: application/json.
  // `skip` only ever matches loopback traffic outside production (see above),
  // which is what keeps local dev from self-locking out of /api/auth/login.
  app.use(rateLimit({
    windowMs: API_RATE_LIMIT_WINDOW_MS,
    max: API_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    skip: isLocalDevRequest,
    handler: (_req, res) => jsonError(res, 429, RATE_LIMIT_MESSAGE),
  }));
};

// Registered AFTER all routes so every unmatched /api request and every
// unhandled/parse error still returns JSON instead of Express' HTML defaults.
// Route contracts are untouched: controllers already answer with JSON, and this
// only handles responses nothing else produced.
export const applyApiErrorHandlers = (app) => {
  app.use('/api', (_req, res) => jsonError(res, 404, 'Endpoint not found.'));

  // Express identifies this as an error handler by its 4-argument signature.
  // Generic messages only — never leak internals to the client.
  app.use((err, _req, res, next) => {
    if (res.headersSent) return next(err);
    if (err?.type === 'entity.parse.failed') return jsonError(res, 400, 'Invalid JSON request body.');
    if (err?.type === 'entity.too.large') return jsonError(res, 413, 'Request body is too large.');
    console.error('[API] Unhandled error:', err?.message || err);
    return jsonError(res, 500, 'Unable to process the request right now. Please try again later.');
  });
};
