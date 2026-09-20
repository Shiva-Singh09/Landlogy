import bcrypt from 'bcryptjs';
import db from '../../models/index.js';
import { generateOtp, hashOtp, verifyOtpHash, BCRYPT_ROUNDS } from './otpService.js';
import { transporter } from '../../services/common/emailService.js';
import { invalidateAuthCache } from '../../middleware/auth.js';

export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

// Indirection over invalidateAuthCache so tests can spy on it via
// t.mock.method() (ESM module namespaces are frozen and cannot be modified
// directly; a captured function binding is likewise not mockable).
export const authCache = { invalidate: invalidateAuthCache };

// Validate the new password strength (8–128 chars). Mirrors the rules in
// authController.setPassword for the existing /api/auth/set-password flow.
export const validateResetPassword = (password) => {
  const p = String(password ?? '');
  if (p.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: 'New password must be at least 8 characters.' };
  }
  if (p.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: 'New password is too long.' };
  }
  return { ok: true };
};

// POST /api/client/password-reset/request
// Body is intentionally ignored — the new password is NEVER accepted here.
// The recipient is always derived from the authenticated seller (req.user.id).
export const requestPasswordReset = async (userId) => {
  // 1. load authenticated active seller
  const user = await db.User.findByPk(userId);
  if (!user || user.status !== 'active') {
    return { ok: false, status: 401, error: 'Invalid or inactive user.' };
  }

  // 2. invalidate previous active password_reset OTPs (single active token)
  await db.OtpToken.update(
    { is_used: true, used_at: new Date() },
    { where: { user_id: user.id, purpose: 'password_reset', is_used: false } }
  );

  // 3-6. generate secure 6-digit OTP, hash it, and persist (purpose=password_reset)
  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const token = await db.OtpToken.create({
    user_id: user.id,
    otp_code_hash: codeHash,
    purpose: 'password_reset',
    is_used: false,
    expires_at: new Date(Date.now() + OTP_TTL_MS),
  });

  // 9. send OTP to the user's registered email (never log the OTP / code)
  try {
    await transporter.sendMail({
      to: user.email,
      subject: 'Your password reset code',
      html: `<p>Your password reset code is <strong>${code}</strong>. It expires in 5 minutes.</p>`,
    });
  } catch (mailErr) {
    // The OTP is still stored and valid; a transient mail failure must not
    // block a retry. Log server-side only — never expose to the client.
    console.error('[AUTH] Failed to send password reset OTP email:', mailErr?.message || mailErr);
  }

  // 10. return success (message is deliberately account-agnostic)
  return { ok: true, message: 'If the account exists, a password reset OTP has been sent.' };
};

// POST /api/client/password-reset/verify
// Body: { otp, new_password }. The password is changed ONLY after the OTP is
// verified (never before).
export const verifyPasswordReset = async (userId, otp, newPassword) => {
  // 3. validate new_password 8–128 chars (before any DB writes)
  const pw = validateResetPassword(newPassword);
  if (!pw.ok) return { ok: false, status: 400, error: pw.error };

  // 1. authenticate seller (re-load to confirm active; identity from req.user.id)
  const user = await db.User.findByPk(userId);
  if (!user || user.status !== 'active') {
    return { ok: false, status: 401, error: 'Invalid or inactive user.' };
  }

  // 4. find latest active password_reset OTP (single-use, server-scoped)
    const token = await db.OtpToken.findOne({
    where: { user_id: user.id, purpose: 'password_reset', is_used: false },
    // Order by the PHYSICAL column (created_at), not the Sequelize attribute
    // name (createdAt). With underscored:true the column is created_at; using
    // the attribute name here throws `column "OtpToken.createdAt does not
    // exist"` -> 502.
    order: [['created_at', 'DESC']],
  });
  // 5. reject missing / expired / used / invalid
  if (!token) {
    return { ok: false, status: 400, error: 'Invalid or expired reset code.' };
  }
  if (new Date(token.expires_at) < new Date()) {
    return { ok: false, status: 400, error: 'Reset code has expired.' };
  }

  // 6. verify OTP hash (constant-time bcrypt compare)
  const match = await verifyOtpHash(otp, token.otp_code_hash);
  if (!match) {
    return { ok: false, status: 400, error: 'Invalid or expired reset code.' };
  }

  // 7. mark OTP used (single-use)
  token.is_used = true;
  token.used_at = new Date();
  await token.save();

  // 8. bcrypt-hash the new password and update password_hash
  user.password_hash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
  // 10. clear the forced-change flag if the column exists on the table
  if (db.User.rawAttributes && db.User.rawAttributes.force_password_change) {
    user.force_password_change = false;
  }
  await user.save();

  // 11. invalidate the auth cache so the next request reflects the new state
  authCache.invalidate(user.id);

  // 12. return success
  return { ok: true, message: 'Password changed successfully.', force_password_change: false };
};
