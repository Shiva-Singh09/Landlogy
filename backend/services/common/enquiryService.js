import db from '../../models/index.js';
import { clean, isValidEmail, isValidPhone } from '../../utils/validation.js';
import { dispatchEnquiryNotifications } from './enquiryMailer.js';

// ── Enquiry submission orchestration ─────────────────────────────────
// Validate → persist to PostgreSQL (the primary record) → fire the outbound
// notifications without blocking the response. An email/SMS outage is logged
// but never fails the request: once an enquiry is saved, writes must succeed
// even if the acknowledgement provider is temporarily unavailable.

const err = (status, error) => ({ type: 'error', status, error });

// Returns { type: 'honeypot' | 'success' | 'error', ... }. The controller maps
// that into an HTTP response. `store` / `notify` are injectable for tests.
export const processEnquirySubmission = async (b, deps = {}) => {
  const store = deps.store || ((values) => db.Enquiry.create(values));
  const notify = deps.notify || dispatchEnquiryNotifications;

  if (clean(b.website, 100)) return { type: 'honeypot' }; // honeypot

  const name = clean(b.name, 100);
  const phone = clean(b.phone, 40);
  const email = clean(b.email, 160);
  const city = clean(b.city, 120);
  const message = clean(b.message, 2000);
  const intent = clean(b.intent, 120);
  const propertyType = clean(b.property_type, 120);
  const formType = clean(b.formType, 60);

  if (!['property-enquiry', 'contact-message'].includes(formType)) return err(400, 'Invalid submission.');
  if (String(b.message ?? '').length > 2000) return err(400, 'Message is too long (max 2000 characters)..');
  if (!name || name.length < 2 || name.length > 80 || /^\d+$/.test(name) || !/[\p{L}]/u.test(name)) return err(400, 'A valid name is required.');
  if (!isValidPhone(phone)) return err(400, 'A valid 10-digit Indian mobile number is required.');
  if (email && !isValidEmail(email)) return err(400, 'A valid email address is required.');
  if (!city) return err(400, 'City/Location is required.');
  if (city.length > 120) return err(400, 'City/Location is too long.');
  if (!intent) return err(400, 'Please select your intent.');
  if (formType === 'property-enquiry' && !propertyType) return err(400, 'Property type is required.');
  if (formType === 'contact-message' && (!message || message.length < 10)) return err(400, 'Please enter a detailed message (min 10 characters).');

  // Persist enquiry — primary record.
  const values = {
    name,
    phone,
    email: email || null,
    city,
    message: message || null,
    intent,
    property_type: propertyType || null,
    status: 'new',
  };
  try {
    await store(values);
  } catch (dbErr) {
    console.error('[DB] Failed to save enquiry:', dbErr?.message || dbErr);
    return err(503, 'Unable to record your enquiry right now. Please try again later.');
  }
  console.log(`[DB] Enquiry saved for ${name} (${phone})`);

  // Outbound notifications (admin email, bilingual acknowledgement email, SMS)
  // are best-effort and asynchronous — never awaited by the request path.
  // Promise.resolve() + .catch() covers both synchronous throws from notify()
  // and async rejections, so a mailer crash can never become an unhandled
  // rejection that takes the process down.
  const notifPayload = {
    formType,
    name,
    phone,
    email: email || null,
    city: city || null,
    message: message || null,
    intent,
    propertyType: propertyType || null,
  };
  try {
    Promise.resolve(notify(notifPayload)).catch((notifyErr) => {
      console.error('[MAIL] Enquiry notification dispatch error:', notifyErr?.message || notifyErr);
    });
  } catch (notifyErr) {
    console.error('[MAIL] Enquiry notification dispatch error:', notifyErr?.message || notifyErr);
  }

  return { type: 'success' };
};