import { requestPasswordReset, verifyPasswordReset } from '../../services/client/passwordResetService.js';

// ── POST /api/client/password-reset/request ───────────────────────────────
// Body: {} — the new password is intentionally NOT accepted here.
// Identity comes exclusively from req.user.id (set by authenticate/authorize).
export const requestReset = async (req, res) => {
  try {
    const result = await requestPasswordReset(req.user.id);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error });
    }
    return res.json({ ok: true, message: result.message });
  } catch (err) {
    console.error('[AUTH] password-reset/request failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to process the request right now. Please try again later.' });
  }
};

// ── POST /api/client/password-reset/verify ────────────────────────────────
// Body: { otp, new_password }. Password is changed ONLY after the OTP verifies.
export const verifyReset = async (req, res) => {
  try {
    const { otp, new_password } = req.body || {};
    const result = await verifyPasswordReset(req.user.id, otp, new_password);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error });
    }
    return res.json({
      ok: true,
      message: result.message,
      force_password_change: result.force_password_change,
    });
  } catch (err) {
    console.error('[AUTH] password-reset/verify failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to process the request right now. Please try again later.' });
  }
};
