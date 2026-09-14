import bcrypt from 'bcryptjs';
import db from '../../models/index.js';
import { generateToken, invalidateAuthCache } from '../../middleware/auth.js';
import { clean } from '../../utils/validation.js';

// ── POST /api/auth/login ──────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input presence (generic error to avoid revealing which field is missing)
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    // Normalize email
    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user by email
    const user = await db.User.findOne({ where: { email: normalizedEmail } });

    // Generic error message — do not reveal if user exists or password is wrong
    const authFailed = () =>
      res.status(401).json({ ok: false, error: 'Invalid email or password.' });

    if (!user) {
      // Perform dummy hash comparison to prevent timing attacks
      await bcrypt.compare(password, '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdum');
      return authFailed();
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return authFailed();
    }

    // Check account status — only active users can log in
    if (user.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'Account is not active. Please contact support.' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Update last login timestamp after responding. Awaiting this write adds a
    // full extra DB round-trip (~400ms to the remote DB) to every login, so
    // fire-and-forget with error logging instead.
    user.update({ last_login_at: new Date() }).catch((loginErr) => {
      console.error('[AUTH] Failed to update last_login_at:', loginErr?.message || loginErr);
    });

    console.log(`[AUTH] Login successful: ${user.email} (${user.role})`);

    // Return safe user information + token
    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        force_password_change: user.force_password_change,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to process login right now. Please try again later.' });
  }
};

// ── POST /api/auth/set-password (authenticated; first-login rotation) ──
export const setPassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters.' });
    }
    if (String(new_password).length > 128) {
      return res.status(400).json({ ok: false, error: 'New password is too long.' });
    }
    const user = await db.User.findByPk(req.user.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ ok: false, error: 'Invalid or inactive user.' });
    }
    if (user.password_hash) {
      if (!current_password) {
        return res.status(400).json({ ok: false, error: 'Current password is required.' });
      }
      const ok = await bcrypt.compare(String(current_password), user.password_hash);
      if (!ok) return res.status(401).json({ ok: false, error: 'Current password is incorrect.' });
    }
    if (current_password && String(current_password) === String(new_password)) {
      return res.status(400).json({ ok: false, error: 'New password must be different from the current password.' });
    }
    user.password_hash = await bcrypt.hash(String(new_password), 10);
    user.force_password_change = false;
    await user.save();
    // force_password_change changed — drop the cached whoami row so the next
    // request reflects it immediately instead of after the 60s TTL.
    invalidateAuthCache(user.id);
    return res.json({ ok: true, message: 'Password updated successfully.', force_password_change: false });
  } catch (err) {
    console.error('[AUTH] set-password failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to update password right now. Please try again later.' });
  }
};

// ── POST /api/auth/register (Admin-only account provisioning; enforced at route) ──
export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Name, email, and password are required.' });
    }

    // Sanitize string fields
    const cleanName = clean(name, 100);
    const cleanEmail = clean(email, 160).toLowerCase();
    const cleanPhone = phone ? clean(phone, 20) : null;

    // Validate field lengths
    if (cleanName.length < 2) {
      return res.status(400).json({ ok: false, error: 'Name must be at least 2 characters.' });
    }

    if (cleanEmail.length < 5) {
      return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    // Validate password strength
    if (String(password).length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters.' });
    }

    // Check for duplicate email before attempting create
    const existingUser = await db.User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Create admin user with safe defaults
    // Role is always 'admin' — this endpoint is for admin account provisioning only
    const user = await db.User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'admin',
      phone: cleanPhone,
      status: 'active',
      is_email_verified: false,
      is_phone_verified: false,
      force_password_change: true,
    });

    console.log(`[AUTH] User created: ${user.email} (${user.role}) by admin ${req.user.id}`);

    // Return safe user data (never include password or password_hash)
    return res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        status: user.status,
        force_password_change: user.force_password_change,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    // Handle unique constraint violation as final protection
    if (err?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ ok: false, error: 'An account with this email already exists.' });
    }
    console.error('[AUTH] Registration failed:', err?.message || err);
    return res.status(502).json({ ok: false, error: 'Unable to create account right now. Please try again later.' });
  }
};
