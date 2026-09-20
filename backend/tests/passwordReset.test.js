import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import {
  buildPasswordResetOtpMail,
  buildPasswordResetSuccessMail,
} from '../services/common/passwordResetMailer.js';
import {
  validatePasswordPolicy,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from '../controllers/common/passwordResetController.js';

describe('Password Reset Mail Templates', () => {
  it('builds a responsive OTP email with Landlogy branding and 6-digit code', () => {
    const mail = buildPasswordResetOtpMail({
      name: 'Priya Sharma',
      otp: '482910',
      expiryMinutes: 5,
    });

    assert.equal(mail.subject, 'Your Password Reset Code — LANDLOGY');
    assert.match(mail.htmlContent, /LANDLOGY/);
    assert.match(mail.htmlContent, /Priya Sharma/);
    assert.match(mail.htmlContent, /482910/);
    assert.match(mail.htmlContent, /5 minutes/);
    assert.match(mail.textContent, /482910/);
    assert.match(mail.textContent, /5 minutes/);
    assert.equal(mail.headers['X-LANDLOGY-Message-Type'], 'password-reset-otp');
  });

  it('escapes user input in the OTP email template', () => {
    const mail = buildPasswordResetOtpMail({
      name: '<script>alert("xss")</script>',
      otp: '123456',
    });
    assert.doesNotMatch(mail.htmlContent, /<script>/);
    assert.match(mail.htmlContent, /&lt;script&gt;/);
  });

  it('builds a password reset confirmation email', () => {
    const mail = buildPasswordResetSuccessMail({ name: 'Rahul Verma' });
    assert.equal(mail.subject, 'Your LANDLOGY Password Was Changed');
    assert.match(mail.htmlContent, /Rahul Verma/);
    assert.match(mail.htmlContent, /successfully updated/);
    assert.match(mail.textContent, /successfully updated/);
    assert.equal(mail.headers['X-LANDLOGY-Message-Type'], 'password-reset-success');
  });
});

describe('Password Policy Validation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    assert.equal(validatePasswordPolicy('abc1'), 'Password must be at least 8 characters long.');
  });

  it('rejects passwords without numbers', () => {
    assert.equal(validatePasswordPolicy('abcdefgh'), 'Password must contain at least one letter and one number.');
  });

  it('rejects passwords without letters', () => {
    assert.equal(validatePasswordPolicy('12345678'), 'Password must contain at least one letter and one number.');
  });

  it('accepts strong passwords meeting policy', () => {
    assert.equal(validatePasswordPolicy('SecurePass123!'), null);
    assert.equal(validatePasswordPolicy('password99'), null);
  });
});

describe('Password Reset Controller Logic', () => {
  let savedApiKey;
  before(() => {
    savedApiKey = process.env.BREVO_API_KEY;
    // Suppress real external HTTP network requests during controller unit tests
    delete process.env.BREVO_API_KEY;
  });

  after(() => {
    if (savedApiKey !== undefined) process.env.BREVO_API_KEY = savedApiKey;
  });

  const makeMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  it('forgotPassword: returns generic message for non-existent email (no enumeration)', async () => {
    const originalFindOne = db.User.findOne;
    db.User.findOne = async () => null;

    try {
      const req = { body: { email: 'nonexistent@example.com' } };
      const res = makeMockRes();

      await forgotPassword(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.ok, true);
      assert.match(res.jsonData.message, /If this email is registered/);
    } finally {
      db.User.findOne = originalFindOne;
    }
  });

  it('forgotPassword: rejects invalid email formats with 400', async () => {
    const req = { body: { email: 'invalid-email' } };
    const res = makeMockRes();

    await forgotPassword(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.ok, false);
  });

  it('forgotPassword: enforces 60-second resend cooldown', async () => {
    const originalUserFindOne = db.User.findOne;
    const originalOtpFindOne = db.PasswordResetOtp.findOne;

    db.User.findOne = async () => ({ id: 'u1', email: 'test@example.com', name: 'Test', status: 'active' });
    db.PasswordResetOtp.findOne = async () => ({
      email: 'test@example.com',
      last_sent_at: new Date(Date.now() - 20 * 1000), // sent 20s ago (cooldown is 60s)
    });

    try {
      const req = { body: { email: 'test@example.com' } };
      const res = makeMockRes();

      await forgotPassword(req, res);
      assert.equal(res.statusCode, 429);
      assert.equal(res.jsonData.ok, false);
      assert.match(res.jsonData.error, /Please wait/);
    } finally {
      db.User.findOne = originalUserFindOne;
      db.PasswordResetOtp.findOne = originalOtpFindOne;
    }
  });

  it('verifyOtp: increments attempts_used on wrong OTP and rejects', async () => {
    const originalOtpFindOne = db.PasswordResetOtp.findOne;
    const realOtpHash = await bcrypt.hash('123456', 10);

    let savedAttempts = 0;
    const mockRecord = {
      id: 'otp-1',
      user_id: 'u-1',
      email: 'user@example.com',
      otp_hash: realOtpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      attempts_used: 1,
      consumed_at: null,
      async save() {
        savedAttempts = this.attempts_used;
      },
    };

    db.PasswordResetOtp.findOne = async () => mockRecord;

    try {
      const req = { body: { email: 'user@example.com', otp: '999999' } };
      const res = makeMockRes();

      await verifyOtp(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.ok, false);
      assert.equal(savedAttempts, 2);
      assert.equal(res.jsonData.attempts_remaining, 3);
    } finally {
      db.PasswordResetOtp.findOne = originalOtpFindOne;
    }
  });

  it('verifyOtp: marks consumed and returns scoped JWT reset token on correct OTP', async () => {
    const originalOtpFindOne = db.PasswordResetOtp.findOne;
    const realOtpHash = await bcrypt.hash('654321', 10);

    let wasConsumed = false;
    const mockRecord = {
      id: 'otp-2',
      user_id: 'u-2',
      email: 'seller@example.com',
      otp_hash: realOtpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      attempts_used: 0,
      consumed_at: null,
      async save() {
        if (this.consumed_at) wasConsumed = true;
      },
    };

    db.PasswordResetOtp.findOne = async () => mockRecord;

    try {
      const req = { body: { email: 'seller@example.com', otp: '654321' } };
      const res = makeMockRes();

      await verifyOtp(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.ok, true);
      assert.equal(wasConsumed, true);
      assert.ok(res.jsonData.reset_token);

      // Verify the returned token scope
      const secret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
      const decoded = jwt.verify(res.jsonData.reset_token, secret);
      assert.equal(decoded.scope, 'password_reset');
      assert.equal(decoded.userId, 'u-2');
      assert.equal(decoded.email, 'seller@example.com');
    } finally {
      db.PasswordResetOtp.findOne = originalOtpFindOne;
    }
  });

  it('resetPassword: updates user password, invalidates OTP and session', async () => {
    const secret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const validToken = jwt.sign(
      { userId: '11111111-1111-1111-1111-111111111111', email: 'owner@example.com', otpId: '22222222-2222-2222-2222-222222222222', scope: 'password_reset' },
      secret,
      { expiresIn: '10m' }
    );

    const originalUserFindByPk = db.User.findByPk;
    const originalOtpFindByPk = db.PasswordResetOtp.findByPk;
    const originalRefreshDestroy = db.RefreshToken.destroy;

    let savedPasswordHash = null;
    let otpDestroyed = false;

    db.User.findByPk = async () => ({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'owner@example.com',
      name: 'Owner',
      status: 'active',
      password_hash: 'oldhash',
      force_password_change: true,
      async save() {
        savedPasswordHash = this.password_hash;
      },
    });

    db.PasswordResetOtp.findByPk = async () => ({
      id: '22222222-2222-2222-2222-222222222222',
      async destroy() {
        otpDestroyed = true;
      },
    });

    db.RefreshToken.destroy = async () => 1;

    try {
      const req = {
        body: {
          reset_token: validToken,
          new_password: 'NewStrongPassword123',
          confirm_password: 'NewStrongPassword123',
        },
      };
      const res = makeMockRes();

      await resetPassword(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.jsonData.ok, true);
      assert.equal(otpDestroyed, true);
      assert.ok(savedPasswordHash);
      assert.equal(await bcrypt.compare('NewStrongPassword123', savedPasswordHash), true);
    } finally {
      db.User.findByPk = originalUserFindByPk;
      db.PasswordResetOtp.findByPk = originalOtpFindByPk;
      db.RefreshToken.destroy = originalRefreshDestroy;
    }
  });

  it('resetPassword: rejects mismatched passwords', async () => {
    const secret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const validToken = jwt.sign(
      { userId: '11111111-1111-1111-1111-111111111111', email: 'owner@example.com', otpId: '22222222-2222-2222-2222-222222222222', scope: 'password_reset' },
      secret,
      { expiresIn: '10m' }
    );

    const req = {
      body: {
        reset_token: validToken,
        new_password: 'Password123',
        confirm_password: 'DifferentPassword123',
      },
    };
    const res = makeMockRes();

    await resetPassword(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.ok, false);
    assert.match(res.jsonData.error, /do not match/);
  });

  it('resetPassword: rejects expired or forged tokens', async () => {
    const forgedToken = jwt.sign(
      { userId: '11111111-1111-1111-1111-111111111111', email: 'owner@example.com', scope: 'password_reset' },
      'wrong-secret-key-123',
      { expiresIn: '10m' }
    );

    const req = {
      body: {
        reset_token: forgedToken,
        new_password: 'NewStrongPassword123',
        confirm_password: 'NewStrongPassword123',
      },
    };
    const res = makeMockRes();

    await resetPassword(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonData.ok, false);
  });
});
