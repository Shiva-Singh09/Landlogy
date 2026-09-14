import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  applySecurityMiddleware,
  applyApiErrorHandlers,
  RATE_LIMIT_MESSAGE,
  API_RATE_LIMIT_MAX,
  isLocalDevRequest,
} from '../middleware/security.js';

// isLocalDevRequest() reads NODE_ENV per request, so a single imported module
// can be exercised under both production and development semantics here.
// `undefined` genuinely removes the variable (assigning undefined would set the
// literal string "undefined" and leak into later cases).
const withNodeEnv = async (value, run) => {
  const hadValue = Object.prototype.hasOwnProperty.call(process.env, 'NODE_ENV');
  const previous = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    if (hadValue && previous !== undefined) process.env.NODE_ENV = previous;
    else delete process.env.NODE_ENV;
  }
};

// Each app built here gets its own in-memory limiter store, so tests never
// share (or exhaust) the counter used by the other cases.
const startApp = async (configure) => {
  const app = express();
  applySecurityMiddleware(app);      // same middleware stack the real server uses
  configure(app);
  applyApiErrorHandlers(app);        // same JSON safety net the real server uses

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
};

const apiApp = () =>
  startApp((app) => {
    app.get('/api/ping', (_req, res) => res.json({ ok: true }));
    app.post('/api/echo', (req, res) => res.json({ ok: true, body: req.body }));
  });

describe('rate limiter — JSON 429 contract', () => {
  it('rejects with valid JSON, application/json and HTTP 429 in production (limit not weakened)', async () => {
    await withNodeEnv('production', async () => {
      const { server, base } = await apiApp();
      try {
        const statuses = [];
        let limited = null;
        // max is 40 → request 41 must be rejected. Limit itself is asserted below.
        for (let i = 1; i <= API_RATE_LIMIT_MAX + 1; i += 1) {
          const res = await fetch(`${base}/api/ping`);
          statuses.push(res.status);
          if (res.status === 429) {
            limited = res;
            break;
          }
        }

        assert.equal(API_RATE_LIMIT_MAX, 40, 'the /api limiter must stay at 40 requests / 15 min');
        assert.equal(statuses.filter((s) => s === 200).length, API_RATE_LIMIT_MAX, `the first ${API_RATE_LIMIT_MAX} requests must still be allowed`);
        assert.ok(limited, `request ${API_RATE_LIMIT_MAX + 1} must be rate limited`);
        assert.equal(limited.status, 429, 'HTTP status must stay 429');

        const contentType = limited.headers.get('content-type') || '';
        assert.match(contentType, /^application\/json/, `Content-Type must be JSON, got "${contentType}"`);

        // The regression: a plain-text body made res.json() throw
        // "Unexpected token 'T', "Too many r"... is not valid JSON".
        const raw = await limited.text();
        assert.doesNotThrow(() => JSON.parse(raw), `body must be valid JSON, got "${raw}"`);
        const parsed = JSON.parse(raw);
        assert.deepEqual(parsed, { ok: false, error: RATE_LIMIT_MESSAGE });
        assert.equal(RATE_LIMIT_MESSAGE, 'Too many requests. Please try again later.');

        // Anti-regression: rate-limit headers still advertised.
        assert.ok(limited.headers.get('ratelimit') || limited.headers.get('ratelimit-limit'), 'standard rate-limit headers expected');
      } finally {
        server.close();
      }
    });
  });

  // Local-dev lockout fix: with NODE_ENV === 'development' the developer's own
  // loopback traffic must never be counted/blocked, so a dev session cannot be
  // locked out of /api/auth/login with "Too many attempts" for 15 minutes.
  it('never blocks loopback traffic in development, and only there', async () => {
    await withNodeEnv('development', async () => {
      assert.equal(isLocalDevRequest({ ip: '127.0.0.1' }), true);
      assert.equal(isLocalDevRequest({ ip: '::1' }), true);
      assert.equal(isLocalDevRequest({ ip: '::ffff:127.0.0.1' }), true);
      assert.equal(isLocalDevRequest({ ip: '203.0.113.7' }), false, 'non-loopback clients are never exempt');

      const { server, base } = await apiApp();
      try {
        const statuses = [];
        for (let i = 1; i <= API_RATE_LIMIT_MAX + 10; i += 1) {
          const res = await fetch(`${base}/api/ping`);
          statuses.push(res.status);
        }
        // 50 requests from 127.0.0.1 in development → zero 429s.
        assert.equal(statuses.filter((s) => s === 429).length, 0, 'loopback dev traffic must not be rate limited');
      } finally {
        server.close();
      }
    });

    // Same loopback traffic must still be limited in production.
    await withNodeEnv('production', async () => {
      assert.equal(isLocalDevRequest({ ip: '127.0.0.1' }), false, 'production is never exempt, even for loopback');
    });

    // Safety: an unset/unknown NODE_ENV must NOT enable the exemption, so a
    // misconfigured deploy keeps the limiter instead of losing it.
    await withNodeEnv(undefined, async () => {
      assert.equal(isLocalDevRequest({ ip: '127.0.0.1' }), false, 'unset NODE_ENV must not enable the dev exemption');
    });
  });
});

describe('api JSON failure responses', () => {
  it('returns JSON for an unmatched /api route', async () => {
    const { server, base } = await apiApp();
    try {
      const res = await fetch(`${base}/api/does-not-exist`);
      assert.equal(res.status, 404);
      assert.match(res.headers.get('content-type') || '', /^application\/json/);
      assert.deepEqual(await res.json(), { ok: false, error: 'Endpoint not found.' });
    } finally {
      server.close();
    }
  });

  it('returns JSON for a malformed JSON body', async () => {
    const { server, base } = await apiApp();
    try {
      const res = await fetch(`${base}/api/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"broken":',
      });
      assert.equal(res.status, 400);
      assert.match(res.headers.get('content-type') || '', /^application\/json/);
      const body = await res.json();
      assert.equal(body.ok, false);
      assert.equal(typeof body.error, 'string');
    } finally {
      server.close();
    }
  });

  it('keeps successful route responses unchanged', async () => {
    const { server, base } = await apiApp();
    try {
      const res = await fetch(`${base}/api/ping`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    } finally {
      server.close();
    }
  });
});
