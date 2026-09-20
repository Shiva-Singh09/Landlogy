import db from '../../models/index.js';
import { clean, isValidEmail, isValidPhone, normalizePhone } from '../../utils/validation.js';
import { sendTextBeeSms } from './smsService.js';

// ── Landing-page feedback submission ─────────────────────────────────
// Feedback is a product-improvement channel, NOT a sales lead. It is stored in
// its own `feedback` table and deliberately never touches the enquiry workflow:
// no enquiry row, no admin notification, no enquiry email/SMS, no user
// creation, no property/broker assignment and no enquiry count/trend impact.
//
// Flow: validate → persist to PostgreSQL (the primary record) → fire exactly
// one static thank-you SMS. The SMS is best-effort: a gateway outage is logged
// and can neither delay nor fail the request, and never rolls back the save.

export const FEEDBACK_SOURCE = 'seller-landing-page';

// Fixed, deterministic copy — no AI/LLM, no template service, one message only.
export const FEEDBACK_THANKYOU_SMS = 'Thank you for your feedback to LANDLOGY. Your response helps us improve our platform.';

export const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;

const err = (status, error) => ({ type: 'error', status, error });

// Returns { type: 'honeypot' | 'success' | 'error', ... }. The controller maps
// that into an HTTP response. `store` / `sendSms` are injectable for tests.
export const processFeedbackSubmission = async (b, deps = {}) => {
  const store = deps.store || ((values) => db.Feedback.create(values));
  const sendSms = deps.sendSms || sendTextBeeSms;

  if (clean(b.website, 100)) return { type: 'honeypot' }; // honeypot

  // The message is stored verbatim (no truncation): only an upper bound is
  // enforced so a single submission cannot bloat the row.
  const message = String(b.message ?? '').trim();
  if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) return err(400, `Message is too long (max ${MAX_FEEDBACK_MESSAGE_LENGTH} characters).`);

  const name = clean(b.name, 100);
  const phone = clean(b.phone, 40);
  const email = clean(b.email, 160);

  if (!name || name.length < 2 || name.length > 80 || /^\d+$/.test(name) || !/[\p{L}]/u.test(name)) return err(400, 'A valid name is required.');
  if (!isValidPhone(phone)) return err(400, 'A valid 10-digit Indian mobile number is required.');
  if (email && !isValidEmail(email)) return err(400, 'A valid email address is required.');
  if (message.length < 10) return err(400, 'Please enter a detailed message (min 10 characters).');

  // Phone is validated above (the public form requires it) and is used only to
  // deliver the thank-you SMS — it is deliberately NOT persisted, because this
  // table stores product feedback rather than lead data.
  const values = {
    name,
    email: email || null,
    rating: clean(b.rating, 30) || null,
    message,
    source: clean(b.source, 60) || FEEDBACK_SOURCE,
  };

  try {
    await store(values);
  } catch (dbErr) {
    console.error('[DB] Failed to save feedback:', dbErr?.message || dbErr);
    return err(503, 'Unable to record your feedback right now. Please try again later.');
  }
  // No personal data is echoed to the server log for this channel.
  console.log('[DB] Feedback saved');

  // Exactly one static thank-you SMS, dispatched only after the row is stored.
  // Promise.resolve() + .catch() covers both synchronous throws and async
  // rejections, so a gateway failure never becomes an unhandled rejection and
  // never changes the API result (same convention as the enquiry dispatch).
  try {
    Promise.resolve(sendSms(normalizePhone(phone), FEEDBACK_THANKYOU_SMS)).catch((smsErr) => {
      console.error('[SMS] Feedback thank-you dispatch error:', smsErr?.message || smsErr);
    });
  } catch (smsErr) {
    console.error('[SMS] Feedback thank-you dispatch error:', smsErr?.message || smsErr);
  }

  return { type: 'success' };
};
