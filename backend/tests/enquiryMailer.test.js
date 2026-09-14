import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEnquiryAckMail,
  buildAdminEnquiryMail,
  sendEnquiryAckEmail,
  dispatchEnquiryNotifications,
} from '../services/common/enquiryMailer.js';

const propertyPayload = {
  formType: 'property-enquiry',
  name: 'Rahul Sharma',
  phone: '+91 9876543210',
  email: 'rahul@example.com',
  city: 'Lucknow',
  message: 'Interested in a 3BHK flat near Hazratganj',
  intent: 'Buy',
  propertyType: 'Residential Apartment',
};

describe('buildEnquiryAckMail (bilingual acknowledgement template)', () => {
  it('uses the property-enquiry subject and English + Hindi content', () => {
    const mail = buildEnquiryAckMail({
      isProperty: true, name: propertyPayload.name, propertyType: propertyPayload.propertyType,
      city: propertyPayload.city, intent: propertyPayload.intent, message: propertyPayload.message,
    });
    assert.equal(mail.subject, 'We received your property enquiry — LANDLOGY');
    assert.match(mail.htmlContent, /Thank you for your property enquiry with LANDLOGY/);
    assert.match(mail.htmlContent, /Our team will review your requirements and contact you as soon as possible\./);
    // Hindi block
    assert.match(mail.htmlContent, /धन्यवाद/);
    assert.match(mail.htmlContent, /नमस्ते/);
    assert.match(mail.htmlContent, /हमारी टीम आपकी आवश्यकता की समीक्षा करेगी/);
    // Plain-text mirror still carries both languages
    assert.match(mail.textContent, /हिंदी:/);
    assert.match(mail.textContent, /LANDLOGY Team/);
    assert.equal(mail.headers['X-LANDLOGY-Message-Type'], 'property-enquiry-ack');
  });

  it('escapes user-supplied values in the acknowledgement body', () => {
    const mail = buildEnquiryAckMail({
      isProperty: true, name: '<Rahul> & "demo"', propertyType: 'A&B', city: 'Lucknow', intent: 'Buy', message: null,
    });
    assert.doesNotMatch(mail.htmlContent, /<Rahul>/);
    assert.match(mail.htmlContent, /&lt;Rahul&gt; &amp;/);
    assert.match(mail.htmlContent, /A&amp;B/);
  });

  it('uses the contact-message subject and wording for contact form submissions', () => {
    const mail = buildEnquiryAckMail({
      isProperty: false, name: 'Priya', propertyType: null, city: 'Delhi', intent: 'General', message: 'Hello team, please call me back.',
    });
    assert.equal(mail.subject, 'We received your message — LANDLOGY');
    assert.match(mail.htmlContent, /Thank you very much for contacting LANDLOGY/);
    assert.match(mail.htmlContent, /धन्यवाद/);
    assert.equal(mail.headers['X-LANDLOGY-Message-Type'], 'contact-message-ack');
  });
});

describe('buildAdminEnquiryMail (internal notification)', () => {
  it('builds the internal notification and uses the submitter email only as replyTo', () => {
    const mail = buildAdminEnquiryMail(propertyPayload);
    assert.equal(mail.subject, 'New Property Enquiry — LANDLOGY');
    assert.deepEqual(mail.replyTo, { email: 'rahul@example.com' });
    assert.match(mail.htmlContent, /Lucknow/);
    assert.match(mail.textContent, /Email: rahul@example\.com/);
  });

  it('omits replyTo when the submitter provided no valid email', () => {
    const mail = buildAdminEnquiryMail({ ...propertyPayload, email: '' });
    assert.equal(mail.subject, 'New Property Enquiry — LANDLOGY');
    assert.equal(mail.replyTo, undefined);
  });
});

describe('sendEnquiryAckEmail safety', () => {
  it('never attempts a send for a missing/invalid submitter email', async () => {
    const noEmail = await sendEnquiryAckEmail({ ...propertyPayload, email: null });
    assert.deepEqual(noEmail, { sent: false, reason: 'no-email' });
    const badEmail = await sendEnquiryAckEmail({ ...propertyPayload, email: 'not-an-email' });
    assert.deepEqual(badEmail, { sent: false, reason: 'no-email' });
  });
});

describe('dispatchEnquiryNotifications', () => {
  it('fires admin email, ONE acknowledgement email, and the SMS for property enquiries', async () => {
    let adminCalls = 0, ackCalls = 0, smsCalls = 0;
    let ackPayload = null;
    const results = await dispatchEnquiryNotifications(propertyPayload, {
      sendAdmin: async () => { adminCalls += 1; return { sent: true, messageId: 'admin-1' }; },
      sendAck: async (p) => { ackCalls += 1; ackPayload = p; return { sent: true, messageId: 'ack-1' }; },
      sendSms: async () => { smsCalls += 1; return { sent: true }; },
    });
    assert.equal(adminCalls, 1);
    assert.equal(ackCalls, 1, 'exactly one acknowledgement email');
    assert.equal(smsCalls, 1);
    // The acknowledgement goes to the submitter's own validated email.
    assert.equal(ackPayload.email, 'rahul@example.com');
    assert.equal(ackPayload.name, 'Rahul Sharma');
    assert.equal(results.adminEmail.sent, true);
    assert.equal(results.ackEmail.sent, true);
    assert.equal(results.smsAck.sent, true);
  });

  it('sends the acknowledgement email for contact messages (no SMS)', async () => {
    let ackCalls = 0, smsCalls = 0;
    await dispatchEnquiryNotifications(
      { ...propertyPayload, formType: 'contact-message', message: 'Please call me back, thanks.' },
      {
        sendAdmin: async () => ({ sent: true }),
        sendAck: async () => { ackCalls += 1; return { sent: true }; },
        sendSms: async () => { smsCalls += 1; return { sent: true }; },
      },
    );
    assert.equal(ackCalls, 1);
    assert.equal(smsCalls, 0);
  });

  it('logs and isolates an admin-email failure without preventing the acknowledgement', async () => {
    let ackCalls = 0;
    const results = await dispatchEnquiryNotifications(propertyPayload, {
      sendAdmin: async () => { throw new Error('provider down'); },
      sendAck: async () => { ackCalls += 1; return { sent: true, messageId: 'ack-1' }; },
      sendSms: async () => ({ sent: false, reason: 'provider-down' }),
    });
    assert.equal(results.adminEmail.sent, false);
    assert.equal(ackCalls, 1, 'acknowledgement must still be attempted when admin email fails');
    assert.equal(results.ackEmail.sent, true);
  });

  it('skips the acknowledgement entirely when the submitter email is invalid', async () => {
    const results = await dispatchEnquiryNotifications(
      { ...propertyPayload, email: 'not-an-email' },
      {
        sendAdmin: async () => ({ sent: true }),
        sendSms: async () => ({ sent: true }),
      },
    );
    assert.deepEqual(results.ackEmail, { sent: false, reason: 'no-email' });
  });
});