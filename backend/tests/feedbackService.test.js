import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import db from '../models/index.js';
import {
  processFeedbackSubmission,
  FEEDBACK_SOURCE,
  FEEDBACK_THANKYOU_SMS,
} from '../services/common/feedbackService.js';

const validBody = {
  formType: 'feedback',
  name: 'Rohit Verma',
  phone: '9876543210',
  email: 'rohit@example.com',
  rating: 'Very helpful',
  source: 'seller-landing-page',
  message: '[Very helpful] Please add more photos and a map view.',
};

const makeDeps = (overrides = {}) => {
  const calls = { store: [], sms: [] };
  const deps = {
    store: async (values) => { calls.store.push(values); return { id: 'fb-1', ...values }; },
    sendSms: async (phone, message) => { calls.sms.push({ phone, message }); return { sent: true }; },
    ...overrides,
  };
  return { deps, calls };
};

// The thank-you SMS is intentionally fire-and-forget (like the enquiry
// dispatch), so tests flush the microtask queue before asserting on it.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('processFeedbackSubmission', () => {
  it('persists exactly one feedback row and fires exactly one static thank-you SMS', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission(validBody, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store.length, 1, 'exactly one feedback store call');
    await flush();
    assert.equal(calls.sms.length, 1, 'exactly one SMS attempt');
    assert.equal(calls.sms[0].message, FEEDBACK_THANKYOU_SMS, 'SMS copy is static/deterministic');
    assert.equal(calls.sms[0].phone, '+919876543210', 'SMS uses the normalized validated phone');
  });

  it('persists name, email, rating, message and source', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission(validBody, deps);
    assert.equal(result.type, 'success');
    const saved = calls.store[0];
    assert.equal(saved.name, 'Rohit Verma');
    assert.equal(saved.email, 'rohit@example.com');
    assert.equal(saved.rating, 'Very helpful');
    assert.equal(saved.message, '[Very helpful] Please add more photos and a map view.');
    assert.equal(saved.source, 'seller-landing-page');
  });

  it('stores the message unchanged (rating prefix kept, no truncation)', async () => {
    const { deps, calls } = makeDeps();
    const longTail = ' x'.repeat(300).trim();
    const message = `[Needs work] Separate enquiries from feedback.${longTail}`;
    const result = await processFeedbackSubmission({ ...validBody, rating: 'Needs work', message }, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store[0].message, message);
    assert.equal(calls.store[0].rating, 'Needs work');
  });

  it('persists an optional email as null when omitted and defaults the source', async () => {
    const { deps, calls } = makeDeps();
    const body = { ...validBody, email: '', source: undefined };
    const result = await processFeedbackSubmission(body, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store[0].email, null);
    assert.equal(calls.store[0].source, FEEDBACK_SOURCE);
  });

  it('never persists the phone number (feedback is not lead data)', async () => {
    const { deps, calls } = makeDeps();
    await processFeedbackSubmission(validBody, deps);
    assert.equal('phone' in calls.store[0], false, 'phone must not be stored in the feedback table');
  });

  it('rejects an invalid phone before any store or SMS side effect', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission({ ...validBody, phone: '12345' }, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 400);
    assert.equal(calls.store.length, 0);
    await flush();
    assert.equal(calls.sms.length, 0);
  });

  it('rejects an invalid email before any store or SMS side effect', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission({ ...validBody, email: 'not-an-email' }, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 400);
    assert.equal(calls.store.length, 0);
    await flush();
    assert.equal(calls.sms.length, 0);
  });

  it('rejects an invalid name before any store or SMS side effect', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission({ ...validBody, name: '12345' }, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 400);
    assert.equal(calls.store.length, 0);
    await flush();
    assert.equal(calls.sms.length, 0);
  });

  it('keeps honeypot submissions benign without storing or sending SMS', async () => {
    const { deps, calls } = makeDeps();
    const result = await processFeedbackSubmission({ ...validBody, website: 'http://spam.example' }, deps);
    assert.equal(result.type, 'honeypot');
    assert.equal(calls.store.length, 0);
    await flush();
    assert.equal(calls.sms.length, 0);
  });

  it('returns 503 and sends no SMS when persistence fails', async () => {
    const { deps, calls } = makeDeps({ store: async () => { throw new Error('connection lost'); } });
    const result = await processFeedbackSubmission(validBody, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 503);
    await flush();
    assert.equal(calls.sms.length, 0);
  });

  it('still reports success when the thank-you SMS fails', async () => {
    const { deps, calls } = makeDeps({ sendSms: async () => { throw new Error('sms gateway down'); } });
    const result = await processFeedbackSubmission(validBody, deps);
    assert.equal(result.type, 'success', 'stored feedback must not be failed by the SMS channel');
    assert.equal(calls.store.length, 1);
  });

  it('never writes to the enquiries table or creates admin notifications', async () => {
    const { deps } = makeDeps();
    const originalEnquiryCreate = db.Enquiry.create;
    const originalNotificationCreate = db.Notification.create;
    let enquiryWrites = 0;
    let notificationWrites = 0;
    db.Enquiry.create = async () => {
      enquiryWrites += 1;
      throw new Error('feedback must never create an enquiry');
    };
    db.Notification.create = async () => {
      notificationWrites += 1;
      throw new Error('feedback must never create an admin notification');
    };
    try {
      const result = await processFeedbackSubmission(validBody, deps);
      assert.equal(result.type, 'success');
    } finally {
      db.Enquiry.create = originalEnquiryCreate;
      db.Notification.create = originalNotificationCreate;
    }
    assert.equal(enquiryWrites, 0, 'feedback path must not touch the enquiries table');
    assert.equal(notificationWrites, 0, 'feedback path must not create notifications');
  });
});
