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
// login limiter). Its counter lives in the library's default in-memory store,
// keyed by the client IP (req.ip) — so it is IP-based, not account-based, and it
// is wiped whenever the process restarts.
export const API_RATE_LIMIT_MAX = 40;
export const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Loopback-only exemption for local development. Without it, a dev session
// (page reloads, repeated logins, scripts) exhausts the 40-request window and
// locks the developer out of /api/auth/login with a 429 for up to 15 minutes,
// while the only cure is waiting out the window or restarting the process.
//
// Safety: the exemption requires an EXPLICIT NODE_ENV === 'development' AND a
// loopback peer address. Anything else (production, test, unset NODE_ENV) keeps
// the 40/15-min limit, so a misconfigured deploy can never end up with the
// limiter disabled. Non-loopback clients are never exempt.
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const isLocalDevRequest = (req) =>
  process.env.NODE_ENV === 'development' && LOOPBACK_IPS.has(String(req.ip || ''));

// Cross-cutting app middleware — single source of truth for CORS, body limits,
// static uploads serving and global rate limiting.
export const applySecurityMiddleware = (app) => {
  app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',').map(x=>x.trim()).filter(Boolean)||true,methods:['GET','POST','PATCH','DELETE']}));
  app.use(express.json({limit:'32kb'}));
  app.use('/uploads', express.static(UPLOAD_DIR));
  // Limits are unchanged (40 requests / 15 min window). Only the rejection body
  // is overridden: express-rate-limit's default handler sends plain text, which
  // is not parseable JSON. res.json() also sets Content-Type: application/json.
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
