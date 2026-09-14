import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processEnquirySubmission } from '../services/common/enquiryService.js';

const validBody = {
  formType: 'property-enquiry',
  name: 'Rahul Sharma',
  phone: '+91 9876543210',
  email: 'rahul@example.com',
  city: 'Lucknow',
  message: 'Interested in a 3BHK flat',
  intent: 'Buy',
  property_type: 'Residential Apartment',
};

const makeDeps = (overrides = {}) => {
  const calls = { store: [], notify: [] };
  const deps = {
    store: async (values) => { calls.store.push(values); return { id: 'enq-1', ...values }; },
    notify: async (payload) => { calls.notify.push(payload); return {}; },
    ...overrides,
  };
  return { deps, calls };
};

describe('processEnquirySubmission', () => {
  it('persists a valid enquiry and fires exactly one notification dispatch', async () => {
    const { deps, calls } = makeDeps();
    const result = await processEnquirySubmission(validBody, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store.length, 1);
    const saved = calls.store[0];
    assert.equal(saved.name, 'Rahul Sharma');
    assert.equal(saved.email, 'rahul@example.com');
    assert.equal(saved.status, 'new');
    assert.equal(saved.property_type, 'Residential Apartment');
    // Notification receives the submitter email from the validated payload.
    assert.equal(calls.notify.length, 1, 'exactly one notification dispatch');
    assert.equal(calls.notify[0].email, 'rahul@example.com');
  });

  it('returns 503 and does NOT notify when persistence fails', async () => {
    const { deps, calls } = makeDeps({
      store: async () => { throw new Error('connection lost'); },
    });
    const result = await processEnquirySubmission(validBody, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 503);
    assert.equal(calls.notify.length, 0);
  });

  it('still reports success when the notification dispatch throws', async () => {
    const { deps, calls } = makeDeps({
      notify: async () => { throw new Error('mailer crash'); },
    });
    const result = await processEnquirySubmission(validBody, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store.length, 1, 'enquiry persistence must not be corrupted by email failure');
  });

  it('rejects an invalid email before persistence/email send', async () => {
    const { deps, calls } = makeDeps();
    const result = await processEnquirySubmission({ ...validBody, email: 'not-an-email' }, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 400);
    assert.equal(calls.store.length, 0);
    assert.equal(calls.notify.length, 0);
  });

  it('preserves contact-message row values and still notifies once', async () => {
    const { deps, calls } = makeDeps();
    const body = {
      formType: 'contact-message',
      name: 'Priya Varma',
      phone: '9876501234',
      email: '',
      city: 'Delhi',
      message: 'Please call me back regarding your services.',
      intent: 'General',
    };
    const result = await processEnquirySubmission(body, deps);
    assert.equal(result.type, 'success');
    assert.equal(calls.store[0].email, null);
    assert.equal(calls.store[0].message, body.message);
    assert.equal(calls.notify[0].email, null);
    assert.equal(calls.notify.length, 1);
  });

  it('keeps honeypot submissions benign without persistence', async () => {
    const { deps, calls } = makeDeps();
    const result = await processEnquirySubmission({ ...validBody, website: 'http://spam.example' }, deps);
    assert.equal(result.type, 'honeypot');
    assert.equal(calls.store.length, 0);
    assert.equal(calls.notify.length, 0);
  });

  it('validates the form type before any side effect', async () => {
    const { deps, calls } = makeDeps();
    const result = await processEnquirySubmission({ ...validBody, formType: 'evil' }, deps);
    assert.equal(result.type, 'error');
    assert.equal(result.status, 400);
    assert.equal(calls.store.length, 0);
  });
});