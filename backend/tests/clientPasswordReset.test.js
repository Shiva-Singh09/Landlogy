import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import db from '../models/index.js';
import { transporter } from '../services/common/emailService.js';
import {
  authCache,
  requestPasswordReset,
  verifyPasswordReset,
  OTP_TTL_MS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../services/client/passwordResetService.js';
import { setPassword } from '../controllers/common/authController.js';
import clientRouter from '../routes/client/index.js';
import commonRouter from '../routes/common/index.js';

// Seller self-service password reset (Task 6) coverage.
// Conventions mirror clientNotifications.test.js: node:test + t.mock.method on
// mutable model objects (db.User / db.OtpToken) and on exported mutable
// helpers (transporter, authCache). No live DB or network: every external
// dependency is a mocked method on a shared singleton object.

const seller = '11111111-1111-4111-8111-111111111111';
const newPassword = 'NewSecurePass!23';

const fakeUser = (overrides = {}) => ({
  id: seller,
  email: 'seller@example.com',
  role: 'seller',
  status: 'active',
  password_hash: 'old-hash',
  force_password_change: false,
  save: async function () { return this; },
  ...overrides,
});

const fakeToken = (overrides = {}) => ({
  id: 'token-1',
  user_id: seller,
  otp_code_hash: '',
  purpose: 'password_reset',
  is_used: false,
  expires_at: new Date(Date.now() + 9999),
  save: async function () { return this; },
  ...overrides,
});

const stubRequestOk = (t, user = fakeUser()) => {
  const findByPk = t.mock.method(db.User, 'findByPk', async () => user);
  const update = t.mock.method(db.OtpToken, 'update', async () => [1]);
  const create = t.mock.method(db.OtpToken, 'create', async (attrs) => ({ id: 'token-1', ...attrs }));
  const sendMail = t.mock.method(transporter, 'sendMail', async (req) => req);
  return { user, findByPk, update, create, sendMail };
};

const stubFindOne = (t, token) =>
  t.mock.method(db.OtpToken, 'findOne', async () => token);

const pathsOf = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

test('1. authenticated seller can request an OTP', async (t) => {
  stubRequestOk(t);
  const result = await requestPasswordReset(seller);
  assert.equal(result.ok, true);
  assert.equal(result.message, 'If the account exists, a password reset OTP has been sent.');
});

test('2. request creates a hashed OTP (never plaintext in the DB)', async (t) => {
  const { create, sendMail } = stubRequestOk(t);
  await requestPasswordReset(seller);

  const attrs = create.mock.calls[0].arguments[0];
  assert.equal(attrs.user_id, seller);
  assert.equal(attrs.purpose, 'password_reset');
  assert.equal(attrs.is_used, false);
  assert.equal(typeof attrs.otp_code_hash, 'string');
  assert.ok(attrs.otp_code_hash.startsWith('$2a$'));

  const emailReq = sendMail.mock.calls[0].arguments[0];
  assert.equal(emailReq.to, 'seller@example.com');
  const codeMatch = emailReq.html.match(/\d{6}/);
  assert.ok(codeMatch, 'OTP code was dispatched in the email');
  assert.ok(await bcrypt.compare(codeMatch[0], attrs.otp_code_hash));
  assert.ok(!emailReq.html.includes(attrs.otp_code_hash), 'the OTP hash is never emailed');

  const delta = new Date(attrs.expires_at) - Date.now();
  assert.ok(delta > 0 && delta <= OTP_TTL_MS);
});
test('5. password is unchanged after a reset request', async (t) => {
  const user = fakeUser({ password_hash: 'old-hash' });
  const save = t.mock.method(user, 'save', async function () { return this; });
  stubRequestOk(t, user);

  await requestPasswordReset(seller);
  assert.equal(user.password_hash, 'old-hash');
  assert.equal(save.mock.calls.length, 0);
});

test('6. correct OTP + new password updates the password', async (t) => {
  const code = '123456';
  const user = fakeUser({ password_hash: 'old-hash' });
  const token = fakeToken({ otp_code_hash: await bcrypt.hash(code, 10) });
  const tokenSave = t.mock.method(token, 'save', async function () { return this; });
  const userSave = t.mock.method(user, 'save', async function () { return this; });
  t.mock.method(db.User, 'findByPk', async () => user);
  const findOne = stubFindOne(t, token);
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  const result = await verifyPasswordReset(seller, code, newPassword);
  assert.equal(result.ok, true);
  assert.equal(result.message, 'Password changed successfully.');
  assert.notEqual(user.password_hash, 'old-hash');
  assert.notEqual(user.password_hash, newPassword);
  assert.ok(user.password_hash.startsWith('$2a$'));
  assert.ok(await bcrypt.compare(newPassword, user.password_hash));
  assert.equal(token.is_used, true);
  assert.ok(token.used_at instanceof Date);
  assert.ok(tokenSave.mock.calls.length >= 1);
  assert.equal(userSave.mock.calls.length, 1);
  assert.equal(invalidate.mock.calls.length, 1);
  assert.equal(invalidate.mock.calls[0].arguments[0], seller);
  assert.equal(findOne.mock.calls[0].arguments[0].where.user_id, seller);
});

test('7. wrong OTP is rejected and the password is unchanged', async (t) => {
  const code = '123456';
  const user = fakeUser();
  const token = fakeToken({ otp_code_hash: await bcrypt.hash(code, 10) });
  const tokenSave = t.mock.method(token, 'save', async function () { return this; });
  const userSave = t.mock.method(user, 'save', async function () { return this; });
  t.mock.method(db.User, 'findByPk', async () => user);
  stubFindOne(t, token);
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  const result = await verifyPasswordReset(seller, '000000', newPassword);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(token.is_used, false);
  assert.equal(tokenSave.mock.calls.length, 0);
  assert.equal(userSave.mock.calls.length, 0);
  assert.equal(invalidate.mock.calls.length, 0);
});

test('8. expired OTP is rejected', async (t) => {
  const token = fakeToken({ otp_code_hash: await bcrypt.hash('123456', 10), expires_at: new Date(Date.now() - 1000) });
  const user = fakeUser();
  t.mock.method(db.User, 'findByPk', async () => user);
  stubFindOne(t, token);
  t.mock.method(token, 'save', async function () { return this; });
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  const result = await verifyPasswordReset(seller, '123456', newPassword);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(/expired/i.test(result.error));
  assert.equal(invalidate.mock.calls.length, 0);
});

test('9. reused (already used) OTP is rejected', async (t) => {
  t.mock.method(db.User, 'findByPk', async () => fakeUser());
  const findOne = t.mock.method(db.OtpToken, 'findOne', async () => null);
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  const result = await verifyPasswordReset(seller, '123456', newPassword);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.ok(/Invalid or expired reset code/i.test(result.error));
  assert.equal(invalidate.mock.calls.length, 0);
});
test('10. weak password is rejected (8-128 chars) and no token is consumed', async (t) => {
  const findOne = t.mock.method(db.OtpToken, 'findOne', async () => null);
  t.mock.method(db.User, 'findByPk', async () => fakeUser());
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  const tooShort = await verifyPasswordReset(seller, '123456', 'short');
  assert.equal(tooShort.ok, false);
  assert.equal(tooShort.status, 400);
  assert.ok(/at least 8/.test(tooShort.error));

  const tooLong = await verifyPasswordReset(seller, '123456', 'x'.repeat(MAX_PASSWORD_LENGTH + 1));
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.status, 400);
  assert.ok(/too long/.test(tooLong.error));

  assert.equal(findOne.mock.calls.length, 0);
  assert.equal(invalidate.mock.calls.length, 0);
});

test('11. identity comes from req.user.id (OTP lookups are server-scoped)', async (t) => {
  const user = fakeUser({ password_hash: 'old-hash' });
  const token = fakeToken({ otp_code_hash: await bcrypt.hash('123456', 10) });
  t.mock.method(db.User, 'findByPk', async (id) => {
    assert.equal(id, seller);
    return user;
  });
  const findOne = stubFindOne(t, token);
  t.mock.method(token, 'save', async function () { return this; });
  t.mock.method(user, 'save', async function () { return this; });
  t.mock.method(authCache, 'invalidate', () => {});

  await verifyPasswordReset(seller, '123456', newPassword);
    const findOneOpts = findOne.mock.calls[0].arguments[0];
  assert.equal(findOneOpts.where.user_id, seller);
  assert.equal(findOneOpts.where.purpose, 'password_reset');
  // Order must reference the physical column (created_at), not the JS attribute
  // name (createdAt) — the latter throws a DatabaseError on a real DB.
  assert.deepEqual(findOneOpts.order, [['created_at', 'DESC']]);
});

test('12. the updated password is stored as a bcrypt hash', async (t) => {
  const user = fakeUser({ password_hash: 'old-hash' });
  const token = fakeToken({ otp_code_hash: await bcrypt.hash('123456', 10) });
  t.mock.method(db.User, 'findByPk', async () => user);
  stubFindOne(t, token);
  t.mock.method(token, 'save', async function () { return this; });
  t.mock.method(user, 'save', async function () { return this; });

  await verifyPasswordReset(seller, '123456', newPassword);
  assert.notEqual(user.password_hash, 'old-hash');
  assert.notEqual(user.password_hash, newPassword);
  assert.ok(user.password_hash.startsWith('$2a$'));
  assert.ok(await bcrypt.compare(newPassword, user.password_hash));
  assert.ok(!await bcrypt.compare('wrong-password', user.password_hash));
});

test('13. auth cache is invalidated on success', async (t) => {
  const user = fakeUser();
  const token = fakeToken({ otp_code_hash: await bcrypt.hash('123456', 10) });
  t.mock.method(db.User, 'findByPk', async () => user);
  stubFindOne(t, token);
  t.mock.method(token, 'save', async function () { return this; });
  t.mock.method(user, 'save', async function () { return this; });
  const invalidate = t.mock.method(authCache, 'invalidate', () => {});

  await verifyPasswordReset(seller, '123456', newPassword);
  assert.equal(invalidate.mock.calls.length, 1);
  assert.equal(invalidate.mock.calls[0].arguments[0], seller);
});

test('14. existing /api/auth/set-password remains unaffected; Task-6 routes are mounted', () => {
  assert.equal(typeof setPassword, 'function');
  const clientPaths = pathsOf(clientRouter);
  assert.ok(clientPaths.includes('POST /password-reset/request'), 'POST /password-reset/request must be mounted');
  assert.ok(clientPaths.includes('POST /password-reset/verify'), 'POST /password-reset/verify must be mounted');
  for (const p of ['GET /me', 'POST /properties', 'GET /properties', 'GET /properties/:id', 'GET /notifications', 'PATCH /notifications/read-all']) {
    assert.ok(clientPaths.includes(p), `missing existing client route ${p}`);
  }
  const commonPaths = pathsOf(commonRouter);
  assert.ok(commonPaths.includes('POST /auth/set-password'), 'POST /auth/set-password must remain');
  assert.ok(commonPaths.includes('POST /auth/login'));
  assert.ok(commonPaths.includes('POST /auth/register'));
  assert.ok(commonPaths.includes('POST /enquiries'));
  assert.ok(!pathsOf(clientRouter).includes('POST /auth/set-password'));
});

