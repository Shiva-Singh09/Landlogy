import bcrypt from 'bcryptjs';
import db from '../models/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

async function createAdmin() {
  // Read credentials from environment
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'LANDLOGY Admin';

  // Validate environment configuration
  if (!email || !password) {
    console.error('[BOOTSTRAP] ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.error('[BOOTSTRAP] Example: ADMIN_EMAIL=admin@landlogy.com ADMIN_PASSWORD=SecurePass123 node scripts/create-admin.js');
    process.exit(1);
  }

  // Validate email format
  if (!EMAIL_REGEX.test(email)) {
    console.error('[BOOTSTRAP] Invalid email format.');
    process.exit(1);
  }

  // Validate password strength
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[BOOTSTRAP] Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  try {
    // Connect to database
    await db.sequelize.authenticate();
    console.log('[BOOTSTRAP] Database connection established.');

    // Check if admin already exists
    const existingAdmin = await db.User.findOne({ where: { role: 'admin' } });
    if (existingAdmin) {
      console.log('[BOOTSTRAP] An admin account already exists.');
      console.log(`[BOOTSTRAP] Email: ${existingAdmin.email}`);
      console.log('[BOOTSTRAP] No changes made. To create a different admin, first remove the existing admin.');
      process.exit(0);
    }

    // Check if email is already in use
    const existingEmail = await db.User.findOne({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      console.error('[BOOTSTRAP] This email is already registered.');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await db.User.create({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: 'admin',
      status: 'active',
      is_email_verified: true,
      is_phone_verified: false,
      force_password_change: false,
    });

    console.log('[BOOTSTRAP] Admin account created successfully.');
    console.log(`[BOOTSTRAP] Email: ${admin.email}`);
    console.log(`[BOOTSTRAP] Role: ${admin.role}`);
    console.log(`[BOOTSTRAP] ID: ${admin.id}`);
    console.log('[BOOTSTRAP] You can now login at POST /api/auth/login');
  } catch (err) {
    console.error('[BOOTSTRAP] Failed to create admin:', err?.message || err);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

createAdmin();
