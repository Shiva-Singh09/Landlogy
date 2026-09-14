import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getBrevoClient } from '../common/emailService.js';
import db from '../../models/index.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export { UUID_RE };

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ── Static reference-data cache ──────────────────────────────────────
// property_types / property_categories change only via migrations/seeds, so a
// short in-process cache (5 min TTL, id→row map) is safe here and avoids a DB
// round-trip on every property create that validates these foreign keys.
// Never used for per-user, enquiry, or auth data.
const REF_TTL_MS = 5 * 60 * 1000;
const refCache = {
  types: { at: 0, byId: new Map() },
  categories: { at: 0, byId: new Map() },
};

const loadRefCache = async (kind) => {
  const entry = kind === 'types' ? refCache.types : refCache.categories;
  if (Date.now() - entry.at < REF_TTL_MS && entry.byId.size) return entry.byId;
  const Model = kind === 'types' ? db.PropertyType : db.PropertyCategory;
  const rows = await Model.findAll({ attributes: ['id', 'name', 'slug', 'is_active'] });
  entry.byId = new Map(rows.map((r) => [String(r.id), r]));
  entry.at = Date.now();
  return entry.byId;
};

export const getCachedPropertyType = async (id) => (await loadRefCache('types')).get(String(id)) || null;
export const getCachedPropertyCategory = async (id) => (await loadRefCache('categories')).get(String(id)) || null;

// Strong random temporary password (~14 chars, alphanumeric + suffix).
export const genTempPassword = () =>
  'Ll-' + crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 10) + '!1A';

// True when the runtime Enquiry model carries the conversion-linkage columns
// (i.e. the idempotency migration has been applied).
export const enquiryHasLinkage = (e) => {
  const vals = e?.dataValues || {};
  return ('converted_user_id' in vals) || ('converted_property_id' in vals);
};

// Dedicated seller onboarding email over the existing Brevo client.
// Never logs or returns the credential; caller passes it through only.
export const sendSellerOnboardingEmail = async ({ toEmail, toName, tempPassword }) => {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.error('[MAIL] Seller onboarding email skipped: BREVO_API_KEY/MAIL_FROM missing.');
    return { sent: false, reason: 'email-not-configured' };
  }
  const brevo = getBrevoClient();
  const loginUrl = String(process.env.SELLER_PORTAL_URL || process.env.CLIENT_ORIGIN?.split(',')[0]?.trim() || '').trim();
  const subject = 'Your LANDLOGY client access is approved';
  const text = [
    `Hi ${toName || 'there'},`,
    '',
    'Welcome to LANDLOGY. Your request has been approved and your client access is ready.',
    '',
    `Login email: ${toEmail}`,
    `Temporary password: ${tempPassword}`,
    loginUrl ? `Login URL: ${loginUrl}` : 'Please use the client portal login page shared by our team.',
    '',
    'For your security, please sign in and change this temporary password immediately.',
    '',
    'Regards,',
    'LANDLOGY Team',
  ].join('\n');
  const htmlContent = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#151f2e;padding:22px 24px;"><p style="margin:0;color:#c8922a;font-size:12px;font-weight:700;letter-spacing:.14em;">LANDLOGY</p><h1 style="margin:6px 0 0;color:#ffffff;font-size:19px;">${esc(subject)}</h1></div><div style="padding:22px 24px;color:#0f172a;font-size:14px;line-height:1.65;"><p style="margin:0 0 12px;">Hi ${esc(toName || 'there')},</p><p style="margin:0 0 10px;">Welcome to LANDLOGY. Your request has been <strong>approved</strong> and your client access is ready.</p><table style="width:100%;border-collapse:collapse;margin:14px 0;"><tr><td style="padding:8px 12px;color:#64748b;font-size:13px;width:170px;">Login email</td><td style="padding:8px 12px;color:#0f172a;font-size:14px;font-weight:700;">${esc(toEmail)}</td></tr><tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Temporary password</td><td style="padding:8px 12px;color:#0f172a;font-size:14px;font-weight:700;">${esc(tempPassword)}</td></tr></table>${loginUrl ? `<p style="margin:0 0 10px;">Sign in here: <a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>` : `<p style="margin:0 0 10px;">Please use the client portal login page shared by our team.</p>`}<p style="margin:0 0 10px;">For your security, please sign in and change this temporary password immediately.</p><p style="margin:20px 0 0;color:#64748b;font-size:13px;">Regards,<br/><strong style="color:#0f172a;">LANDLOGY Team</strong></p></div></div></div>`;
  try {
    const r = await brevo.transactionalEmails.sendTransacEmail({
      sender: { name: 'LANDLOGY', email: process.env.MAIL_FROM },
      to: [{ email: toEmail }], subject, htmlContent, textContent: text,
      headers: { 'X-LANDLOGY-Message-Type': 'seller-onboarding' },
    });
    const mid = r?.messageId || r?.messageIds?.[0] || '';
    console.log(`[MAIL] Seller onboarding email delivered${mid ? ` (messageId: ${mid})` : ''}`);
    return { sent: true };
  } catch (e) {
    console.error('[MAIL] Seller onboarding send failed:', { status: e?.status || e?.statusCode || e?.response?.status, message: e?.message });
    return { sent: false, reason: 'send-failed' };
  }
};

// Safe client-visible property fields (no admin notes / internals).
export const safeClientProperty = (p) => ({
  id: p.id, title: p.title, description: p.description, address: p.address,
  city: p.city, state: p.state, pincode: p.pincode,
  latitude: p.latitude, longitude: p.longitude, asking_price: p.asking_price,
  property_type_id: p.property_type_id, property_category_id: p.property_category_id,
  status: p.status, status_history: p.status_history || [],
  created_at: p.created_at, updated_at: p.updated_at,
});

// Runs inside one Sequelize transaction: find-or-create seller (by email),
// find-or-reuse the conversion property, link both onto the enquiry.
// Returns { seller, property, tempPassword, tempPasswordIssued }.
// Throws coded errors: ROLE_CONFLICT / SELLER_INACTIVE.
export const provisionConversionTx = async ({ enquiry, adminId, notes }) => {
  let seller = null;
  let property = null;
  let tempPassword = null;
  let tempPasswordIssued = false;
  const hasLinkCols = enquiryHasLinkage(enquiry);

  await db.sequelize.transaction(async (t) => {
    const sellerEmail = String(enquiry.email || '').trim().toLowerCase();
    seller = await db.User.findOne({ where: { email: sellerEmail }, transaction: t });
    if (seller) {
      if (seller.role !== 'seller') {
        throw Object.assign(new Error('ROLE_CONFLICT'), { code: 'ROLE_CONFLICT' });
      }
      if (seller.status !== 'active') {
        throw Object.assign(new Error('SELLER_INACTIVE'), { code: 'SELLER_INACTIVE' });
      }
    } else {
      tempPassword = genTempPassword();
      const password_hash = await bcrypt.hash(tempPassword, 10);
      seller = await db.User.create({
        name: String(enquiry.name || 'LANDLOGY Client').slice(0, 100),
        email: sellerEmail,
        phone: enquiry.phone ? String(enquiry.phone).slice(0, 20) : null,
        password_hash,
        role: 'seller',
        status: 'active',
        is_email_verified: false,
        is_phone_verified: false,
        force_password_change: true,
      }, { transaction: t });
      tempPasswordIssued = true;
    }

    if (hasLinkCols && enquiry.converted_property_id) {
      const existing = await db.Property.findByPk(enquiry.converted_property_id, { transaction: t });
      if (existing && String(existing.owner_id) === String(seller.id)) property = existing;
    }
    if (!property) {
      const owned = await db.Property.findAll({
        where: { owner_id: seller.id }, order: [['created_at', 'ASC']], limit: 5, transaction: t,
      });
      const legacy = owned.find((p) => Array.isArray(p.status_history) && p.status_history.some((h) => h && h.by === 'enquiry-conversion'));
      if (hasLinkCols && enquiry.status === 'converted' && legacy) property = legacy;
    }
    if (!property) {
      const titleBase = clean(enquiry.property_type, 60) || clean(enquiry.intent, 60);
      const cityBase = clean(enquiry.city, 120);
      const title = `${titleBase ? `${titleBase} — ` : 'Client property — '}${cityBase || clean(enquiry.name, 100) || 'LANDLOGY'}`;
      property = await db.Property.create({
        owner_id: seller.id,
        title: title.slice(0, 200),
        description: enquiry.message ? String(enquiry.message).slice(0, 5000) : (enquiry.intent ? `Intent: ${String(enquiry.intent).slice(0, 500)}` : null),
        city: enquiry.city ? String(enquiry.city).slice(0, 120) : null,
        status: 'under_review',
        status_history: [{ status: 'under_review', at: new Date().toISOString(), by: 'enquiry-conversion' }],
        reviewed_by: adminId,
      }, { transaction: t });
    }

    enquiry.status = 'converted';
    enquiry.reviewed_by = adminId;
    if (notes !== undefined) enquiry.notes = String(notes).slice(0, 5000);
    if (hasLinkCols) {
      enquiry.converted_user_id = seller.id;
      enquiry.converted_property_id = property.id;
    }
    await enquiry.save({ transaction: t });
  });

  return { seller, property, tempPassword, tempPasswordIssued };
};

