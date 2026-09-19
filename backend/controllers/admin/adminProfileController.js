import db from '../../models/index.js';

// ── GET /api/admin/me (Admin only) ───────────────────────────────
// Returns the profile of the currently authenticated admin.
// Safe projection only: password_hash / tokens / OTP data never selected.

const PROFILE_ATTRIBUTES = [
  'id', 'name', 'email', 'phone', 'role', 'status',
  'is_email_verified', 'is_phone_verified', 'force_password_change',
  'last_login_at', 'created_at', 'updated_at',
];

export const getAdminProfile = async (req, res) => {
  try {
    // req.user is a cached auth projection (no verification timestamps), so
    // read the full safe profile from the DB in a single explicit query.
    const user = await db.User.findByPk(req.user.id, { attributes: PROFILE_ATTRIBUTES });

    // authenticate() already proved the account is active; treat a missing row
    // (deleted between auth and this query) as not found without revealing
    // whether any other user exists.
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Admin not found.' });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        is_email_verified: user.is_email_verified,
        is_phone_verified: user.is_phone_verified,
        force_password_change: user.force_password_change,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error('[ADMIN] Failed to load admin profile:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to retrieve profile right now. Please try again later.' });
  }
};
