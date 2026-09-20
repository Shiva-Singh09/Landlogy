import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../models/index.js';
import { invalidateAuthCache } from '../../middleware/auth.js';
import { isValidEmail } from '../../utils/validation.js';
import {
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
} from '../../services/common/passwordResetMailer.js';

const KNOWN_WEAK_JWT_FALLBACK = 'dev-secret-change-in-production';
const getResetSecret = () => {
  const secret = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || KNOWN_WEAK_JWT_FALLBACK;
  if (process.env.NODE_ENV === 'production' && (!secret || secret === KNOWN_WEAK_JWT_FALLBACK)) {
    throw new Error('[AUTH] JWT_SECRET/RESET_TOKEN_SECRET must be set to a strong secret in production.');
  }
  return secret;
};

const parsePositiveInt = (value, fallback) => {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
};

export const getOtpConfig = () => ({
  expiryMinutes: parsePositiveInt(process.env.OTP_EXPIRY_MINUTES, 5),
  cooldownSeconds: parsePositiveInt(process.env.OTP_RESEND_COOLDOWN_SECONDS, 60),
  maxAttempts: parsePositiveInt(process.env.OTP_MAX_ATTEMPTS, 5),
});

// ── Helper: Password Policy ──────────────────────────────────────────
export const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password is too long (maximum 128 characters).';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
};

// ── POST /api/auth/forgot-password ──────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const config = getOtpConfig();

    // Look up user by email
    const user = await db.User.findOne({ where: { email: cleanEmail } });

    // Always use generic response to prevent account enumeration
    const genericSuccessResponse = {
      ok: true,
      message: 'If this email is registered, a verification code has been sent.',
    };

    if (!user || user.status !== 'active') {
      // Timing attack mitigation: do a dummy hash
      await bcrypt.hash('000000', 10);
      return res.json(genericSuccessResponse);
    }

    // Check resend cooldown based on latest OTP row
    const latestOtp = await db.PasswordResetOtp.findOne({
      where: { email: cleanEmail },
      order: [['created_at', 'DESC']],
    });

    if (latestOtp && latestOtp.last_sent_at) {
      const timeSinceLastSentMs = Date.now() - new Date(latestOtp.last_sent_at).getTime();
      const cooldownMs = config.cooldownSeconds * 1000;
      if (timeSinceLastSentMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - timeSinceLastSentMs) / 1000);
        return res.status(429).json({
          ok: false,
          error: `Please wait ${remainingSec} second${remainingSec === 1 ? '' : 's'} before requesting another code.`,
          retry_after_seconds: remainingSec,
        });
      }
    }

    // Generate secure 6-digit numeric OTP
    const otpNumber = crypto.randomInt(100000, 1000000);
    const otp = String(otpNumber);
    const otpHash = await bcrypt.hash(otp, 10);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.expiryMinutes * 60 * 1000);

    // Persist OTP record
    await db.PasswordResetOtp.create({
      user_id: user.id,
      email: cleanEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts_used: 0,
      last_sent_at: now,
      consumed_at: null,
    });

    // Send transactional email via Brevo (fire-and-forget / logged)
    sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      expiryMinutes: config.expiryMinutes,
    }).catch((err) => {
      console.error('[AUTH] Failed to send password reset OTP email:', err?.message || err);
    });

    return res.json(genericSuccessResponse);
  } catch (err) {
    console.error('[AUTH] forgot-password error:', err?.message || err);
    return res.status(502).json({
      ok: false,
      error: 'Unable to process your request right now. Please try again later.',
    });
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }
    if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid 6-digit verification code.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const config = getOtpConfig();

    // Look up the latest non-consumed OTP for this email
    const otpRecord = await db.PasswordResetOtp.findOne({
      where: {
        email: cleanEmail,
        consumed_at: null,
      },
      order: [['created_at', 'DESC']],
    });

    const invalidOrExpiredError = () =>
      res.status(400).json({
        ok: false,
        error: 'Invalid or expired verification code.',
      });

    if (!otpRecord) {
      // Dummy hash compare for timing safety
      await bcrypt.compare(cleanOtp, '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum');
      return invalidOrExpiredError();
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expires_at)) {
      return invalidOrExpiredError();
    }

    // Check attempts limit
    if (otpRecord.attempts_used >= config.maxAttempts) {
      return res.status(400).json({
        ok: false,
        error: 'Maximum verification attempts exceeded. Please request a new code.',
      });
    }

    // Compare OTP hash
    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
    if (!isMatch) {
      otpRecord.attempts_used += 1;
      await otpRecord.save();

      const remaining = Math.max(0, config.maxAttempts - otpRecord.attempts_used);
      return res.status(400).json({
        ok: false,
        error: remaining > 0
          ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Maximum verification attempts exceeded. Please request a new code.',
        attempts_remaining: remaining,
      });
    }

    // Mark OTP consumed
    otpRecord.consumed_at = new Date();
    await otpRecord.save();

    // Issue short-lived password reset JWT (10 minutes)
    const resetSecret = getResetSecret();
    const resetToken = jwt.sign(
      {
        userId: otpRecord.user_id,
        email: otpRecord.email,
        otpId: otpRecord.id,
        scope: 'password_reset',
      },
      resetSecret,
      { expiresIn: '10m' }
    );

    return res.json({
      ok: true,
      message: 'Code verified successfully.',
      reset_token: resetToken,
    });
  } catch (err) {
    console.error('[AUTH] verify-otp error:', err?.message || err);
    return res.status(502).json({
      ok: false,
      error: 'Unable to verify code right now. Please try again later.',
    });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const {
      reset_token,
      resetToken,
      new_password,
      newPassword,
      confirm_password,
      confirmPassword,
    } = req.body || {};

    const token = reset_token || resetToken;
    const password = new_password || newPassword;
    const confirmation = confirm_password || confirmPassword;

    if (!token) {
      return res.status(400).json({ ok: false, error: 'Password reset token is required.' });
    }

    if (!password || !confirmation) {
      return res.status(400).json({ ok: false, error: 'Please fill in both password fields.' });
    }

    if (password !== confirmation) {
      return res.status(400).json({ ok: false, error: 'Passwords do not match.' });
    }

    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      return res.status(400).json({ ok: false, error: policyError });
    }

    // Verify JWT
    const resetSecret = getResetSecret();
    let decoded;
    try {
      decoded = jwt.verify(token, resetSecret);
    } catch (jwtErr) {
      return res.status(401).json({
        ok: false,
        error: 'Password reset link or token has expired or is invalid. Please request a new code.',
      });
    }

    if (decoded.scope !== 'password_reset' || !decoded.userId || !decoded.email) {
      return res.status(401).json({ ok: false, error: 'Invalid reset token scope.' });
    }

    // Verify user exists and is active
    const user = await db.User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ ok: false, error: 'User account is invalid or inactive.' });
    }

    // Check that the OTP row was actually consumed and prevent token reuse
    if (decoded.otpId) {
      const otpRecord = await db.PasswordResetOtp.findByPk(decoded.otpId);
      if (!otpRecord) {
        return res.status(400).json({ ok: false, error: 'Reset session is no longer valid.' });
      }
      // Clean up the OTP row so the resetToken cannot be used again
      await otpRecord.destroy();
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(String(password), 10);

    // Update user password and clear forced password change
    user.password_hash = newPasswordHash;
    user.force_password_change = false;
    await user.save();

    // Invalidate cached whoami data
    invalidateAuthCache(user.id);

    // Invalidate any existing refresh tokens / sessions for this user
    if (db.RefreshToken) {
      await db.RefreshToken.destroy({ where: { user_id: user.id } }).catch((err) => {
        console.error('[AUTH] Failed to invalidate refresh tokens:', err?.message || err);
      });
    }

    console.log(`[AUTH] Password reset successfully for user: ${user.email} (${user.id})`);

    // Send confirmation email asynchronously
    sendPasswordResetSuccessEmail({
      to: user.email,
      name: user.name,
    }).catch((mailErr) => {
      console.error('[AUTH] Failed to send password reset confirmation email:', mailErr?.message || mailErr);
    });

    return res.json({
      ok: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('[AUTH] reset-password error:', err?.message || err);
    return res.status(502).json({
      ok: false,
      error: 'Unable to reset password right now. Please try again later.',
    });
  }
};
