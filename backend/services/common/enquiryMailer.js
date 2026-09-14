import { getBrevoClient } from './emailService.js';
import { sendTextBeeSms } from './smsService.js';
import { isValidEmail, escapeHtml, normalizePhone, formatPhoneDisplay } from '../../utils/validation.js';

// ── Enquiry/contact email + SMS delivery ────────────────────────────
// Single home for the enquiry notification emails so the controller stays
// fast and the bilingual acknowledgement template is testable. An email
// failure never throws: each channel returns { sent:false, reason } and is
// logged. The controller fires these without awaiting them so an external
// email/SMS outage can never delay or break enquiry persistence.

const isPropertyForm = (formType) => formType === 'property-enquiry';

// Internal company (CRM) notification — visitor email used only as replyTo.
export const buildAdminEnquiryMail = (p) => {
  const isProperty = isPropertyForm(p.formType);
  const hasEmail = p.email && isValidEmail(p.email);
  const normPhone = normalizePhone(p.phone);
  const telHref = normPhone ? `tel:${normPhone.replace(/\s+/g, '')}` : '';
  const dispPhone = formatPhoneDisplay(normPhone || p.phone);

  const callCta = telHref
    ? `<div style="margin:18px 0 4px;text-align:center;"><a href="${telHref}" style="display:inline-block;background:#c8922a;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;padding:13px 30px;border-radius:10px;">&#9742; CALL NOW: ${escapeHtml(dispPhone)}</a></div><p style="margin:10px 0 0;text-align:center;color:#64748b;font-size:12px;">Mobile: ${escapeHtml(dispPhone)} (tap CALL NOW on your phone to dial directly)</p>`
    : `<p style="margin:14px 0 0;color:#0f172a;font-size:14px;"><strong>Mobile:</strong> ${escapeHtml(dispPhone)}</p>`;
  const replyCta = hasEmail
    ? `<div style="margin:14px 0 0;text-align:center;"><a href="mailto:${escapeHtml(p.email)}" style="display:inline-block;background:#e2e8f0;color:#0f172a;text-decoration:none;font-weight:700;font-size:13px;padding:10px 22px;border-radius:10px;">&#9993; REPLY TO CUSTOMER: ${escapeHtml(p.email)}</a></div>`
    : '';
  const subject = isProperty ? 'New Property Enquiry — LANDLOGY' : 'New Website Message — LANDLOGY';
  const text = [
    `LANDLOGY website submission`,
    `Type: ${p.formType || 'website-form'}`,
    `Name: ${p.name}`,
    `Phone: ${p.phone}`,
    p.email && `Email: ${p.email}`,
    p.intent && `Intent: ${p.intent}`,
    p.propertyType && `Property Type: ${p.propertyType}`,
    p.city && `City / Location: ${p.city}`,
    p.message && `Message: ${p.message}`,
  ].filter(Boolean).join('\n');
  const row = (label, value) => value
    ? `<tr><td style="padding:8px 12px;color:#64748b;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:8px 12px;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td></tr>`
    : '';
  const htmlContent = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#0f172a;padding:20px 24px;"><h1 style="margin:0;color:#ffffff;font-size:18px;">${escapeHtml(subject)}</h1><p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">LANDLOGY website submission</p></div>${callCta}${replyCta}<table style="width:100%;border-collapse:collapse;">${row('Submission type', p.formType)}${row('Name', p.name)}${row('Phone', p.phone)}${row('Email', p.email)}${row('Intent', p.intent)}${row('Property type', p.propertyType)}${row('City / Location', p.city)}${row('Message', p.message)}</table></div></div>`;

  return {
    subject,
    htmlContent,
    textContent: text,
    replyTo: hasEmail ? { email: p.email } : undefined,
  };
};

// Bilingual (Hindi + English) acknowledgement for the person who submitted
// the form. Reused verbatim from the historical enquiry flow so the previous
// i18n wording is preserved.
export const buildEnquiryAckMail = ({ isProperty, name, propertyType, city, intent, message }) => {
  const ackSubject = isProperty ? 'We received your property enquiry — LANDLOGY' : 'We received your message — LANDLOGY';
  const ackBodyEn = isProperty
    ? `<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">Thank you for your property enquiry with LANDLOGY.</h2><p style="margin:0 0 10px;">We have successfully received your enquiry.</p><p style="margin:0 0 10px;"><strong>Your enquiry details:</strong></p><ul style="margin:0 0 18px;padding-left:18px;"><li><strong>Property Type:</strong> ${escapeHtml(propertyType)}</li><li><strong>City / Location:</strong> ${escapeHtml(city)}</li><li><strong>Intent:</strong> ${escapeHtml(intent)}</li>${message ? `<li><strong>Message:</strong> ${escapeHtml(message)}</li>` : ''}</ul><p style="margin:0 0 10px;">Our team will review your requirements and contact you as soon as possible.</p><p style="margin:0 0 10px;">Thank you for choosing LANDLOGY.</p>`
    : `<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">Thank you very much for contacting LANDLOGY.</h2><p style="margin:0 0 10px;">Your message has successfully reached us.</p><p style="margin:0 0 10px;"><strong>Here is the message you submitted:</strong></p><blockquote style="margin:6px 0 18px;padding:10px 14px;background:#f1f5f9;border-left:4px solid #c8922a;color:#0f172a;font-style:italic;">“${escapeHtml(message)}”</blockquote><p style="margin:0 0 10px;">We truly appreciate you taking the time to contact us.</p><p style="margin:0 0 10px;">Our team will review your message and get back to you as soon as possible.</p><p style="margin:0 0 10px;">Thank you for reaching out to LANDLOGY.</p>`;
  const ackBodyHi = isProperty
    ? `<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">नमस्ते, धन्यवाद।</h2><p style="margin:0 0 10px;">LANDLOGY में प्रॉपर्टी संबंधी पूछताछ करने के लिए आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">हमें आपकी पूछताछ सफलतापूर्वक प्राप्त हो गई है।</p><p style="margin:0 0 10px;"><strong>आपकी पूछताछ का विवरण:</strong></p><ul style="margin:0 0 18px;padding-left:18px;"><li><strong>प्रॉपर्टी का प्रकार:</strong> ${escapeHtml(propertyType)}</li><li><strong>शहर / स्थान:</strong> ${escapeHtml(city)}</li><li><strong>आपकी आवश्यकता:</strong> ${escapeHtml(intent)}</li>${message ? `<li><strong>संदेश:</strong> ${escapeHtml(message)}</li>` : ''}</ul><p style="margin:0 0 10px;">हमारी टीम आपकी आवश्यकता की समीक्षा करेगी और आपसे जल्द से जल्द संपर्क करेगी।</p><p style="margin:0 0 10px;">LANDLOGY को चुनने के लिए आपका धन्यवाद।</p>`
    : `<h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;">नमस्ते, धन्यवाद।</h2><p style="margin:0 0 10px;">LANDLOGY से संपर्क करने के लिए आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">आपका संदेश हमें सफलतापूर्वक प्राप्त हो गया है।</p><p style="margin:0 0 10px;"><strong>आपने हमें यह संदेश भेजा है:</strong></p><blockquote style="margin:6px 0 18px;padding:10px 14px;background:#f1f5f9;border-left:4px solid #c8922a;color:#0f172a;font-style:italic;">“${escapeHtml(message)}”</blockquote><p style="margin:0 0 10px;">हमसे संपर्क करने के लिए अपना समय देने हेतु आपका बहुत-बहुत धन्यवाद।</p><p style="margin:0 0 10px;">हमारी टीम आपके संदेश की समीक्षा करेगी और आपसे जल्द से जल्द संपर्क करेगी।</p><p style="margin:0 0 10px;">LANDLOGY से संपर्क करने के लिए धन्यवाद।</p>`;
  const ackHtml = `<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#f1f5f9;"><div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;"><div style="background:#151f2e;padding:22px 24px;"><p style="margin:0;color:#c8922a;font-size:12px;font-weight:700;letter-spacing:.14em;">LANDLOGY</p><h1 style="margin:6px 0 0;color:#ffffff;font-size:19px;">${escapeHtml(ackSubject)}</h1></div><div style="padding:22px 24px;color:#0f172a;font-size:14px;line-height:1.65;"><p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>${ackBodyEn}<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/><p style="margin:0 0 12px;">नमस्ते ${escapeHtml(name)},</p>${ackBodyHi}<p style="margin:20px 0 0;color:#64748b;font-size:13px;">Regards / सादर,<br/><strong style="color:#0f172a;">LANDLOGY Team</strong><br/>Real Estate &bull; Research &bull; Advisory</p></div></div></div></div></body></html>`;
  const ackText = [
    `Hi ${name},`,
    ackBodyEn.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').trim(),
    '',
    'हिंदी:',
    '',
    ackBodyHi.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').trim(),
    '',
    'Regards / सादर,',
    'LANDLOGY Team',
    'Real Estate • Research • Advisory',
  ].join('\n');

  return {
    subject: ackSubject,
    htmlContent: ackHtml,
    textContent: ackText,
    headers: { 'X-LANDLOGY-Message-Type': isProperty ? 'property-enquiry-ack' : 'contact-message-ack' },
  };
};

// Brevo transactional send for a single recipient. Never throws.
const brevoSend = async ({ to, replyTo, mail }) => {
  const brevo = getBrevoClient();
  const payload = {
    sender: { name: 'LANDLOGY', email: process.env.MAIL_FROM },
    to: [{ email: to }],
    subject: mail.subject,
    htmlContent: mail.htmlContent,
    textContent: mail.textContent,
  };
  if (replyTo) payload.replyTo = replyTo;
  if (mail.headers) payload.headers = mail.headers;
  const result = await brevo.transactionalEmails.sendTransacEmail(payload);
  return result?.messageId || result?.messageIds?.[0] || '';
};

// Admin notification (CRM-style) to MAIL_TO.
export const sendEnquiryAdminEmail = async (p) => {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_TO || !process.env.MAIL_FROM) {
    console.error('[MAIL] Internal enquiry email skipped: BREVO_API_KEY/MAIL_TO/MAIL_FROM missing.');
    return { sent: false, reason: 'email-not-configured' };
  }
  const isProperty = isPropertyForm(p.formType);
  const mail = buildAdminEnquiryMail(p);
  try {
    const internalId = await brevoSend({ to: process.env.MAIL_TO, replyTo: mail.replyTo, mail });
    console.log(`[MAIL] Internal ${isProperty ? 'enquiry' : 'contact'} email delivered${internalId ? ` (messageId: ${internalId})` : ''}`);
    return { sent: true, messageId: internalId };
  } catch (brevoErr) {
    const statusCode = brevoErr?.status || brevoErr?.statusCode || brevoErr?.response?.status;
    const apiBody = brevoErr?.responseBody || brevoErr?.response?.data || brevoErr?.body;
    console.error('[MAIL] Brevo internal send failed:', { status: statusCode, message: brevoErr?.message, body: apiBody });
    return { sent: false, reason: 'send-failed', status: statusCode };
  }
};

// Bilingual acknowledgement to the submitter — only for a validated email.
export const sendEnquiryAckEmail = async (p) => {
  const email = p.email;
  if (!email || !isValidEmail(email)) {
    console.log('[MAIL] Customer acknowledgement skipped: no valid submitter email.');
    return { sent: false, reason: 'no-email' };
  }
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.error('[MAIL] Customer acknowledgement skipped: BREVO_API_KEY/MAIL_FROM missing.');
    return { sent: false, reason: 'email-not-configured' };
  }
  const isProperty = isPropertyForm(p.formType);
  const mail = buildEnquiryAckMail({
    isProperty,
    name: p.name,
    propertyType: p.propertyType,
    city: p.city,
    intent: p.intent,
    message: p.message,
  });
  try {
    const ackId = await brevoSend({ to: email, replyTo: undefined, mail });
    console.log(`[MAIL] Customer ${isProperty ? 'enquiry' : 'contact'} acknowledgement delivered${ackId ? ` (messageId: ${ackId})` : ''}`);
    return { sent: true, messageId: ackId };
  } catch (ackErr) {
    const statusCode = ackErr?.status || ackErr?.statusCode || ackErr?.response?.status;
    const apiBody = ackErr?.responseBody || ackErr?.response?.data || ackErr?.body;
    console.error('[MAIL] Brevo acknowledgement send failed:', { status: statusCode, message: ackErr?.message, body: apiBody });
    return { sent: false, reason: 'send-failed', status: statusCode };
  }
};

const buildEnquirySmsText = (p) => `New LANDLOGY Property Enquiry - ${p.name}. City: ${p.city}. Property: ${p.propertyType}. Intent: ${p.intent}. Our team will contact you soon.`;

// Fire all outbound channels in parallel. Each channel catches and logs its own
// errors, so this promise never rejects and a single failing channel can never
// affect the other deliveries. dispatch() resolves with a per-channel summary.
export const dispatchEnquiryNotifications = async (p, deps = {}) => {
  const sendAdmin = deps.sendAdmin || sendEnquiryAdminEmail;
  const sendAck = deps.sendAck || sendEnquiryAckEmail;
  const sendSms = deps.sendSms || sendTextBeeSms;
  const isProperty = isPropertyForm(p.formType);

  const results = { isProperty, adminEmail: null, ackEmail: null, smsAck: null };

  const run = async (label, fn) => {
    try {
      results[label] = await fn();
    } catch (err) {
      console.error(`[MAIL] ${label} dispatch error:`, err?.message || err);
      results[label] = { sent: false, reason: 'dispatch-error' };
    }
  };

  await Promise.all([
    run('adminEmail', () => sendAdmin(p)),
    run('ackEmail', () => sendAck(p)),
    isProperty ? run('smsAck', () => sendSms(normalizePhone(p.phone), buildEnquirySmsText(p))) : Promise.resolve({ sent: false, reason: 'no-sms-for-contact' }),
  ]);

  return results;
};