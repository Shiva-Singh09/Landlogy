import test from 'node:test';
import assert from 'node:assert/strict';
import db from '../models/index.js';
import { listNotifications, unreadCount, markNotificationRead, markAllNotificationsRead } from '../controllers/admin/adminNotificationController.js';
import { notifyAdmins, NOTIFICATION_TYPES } from '../services/common/notificationService.js';

const recipient = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const request = (query = {}) => ({ user: { id: recipient }, query, params: { id } });
function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test('notification list and unread count always use authenticated recipient', async (t) => {
  t.mock.method(db.Notification, 'findAndCountAll', async (options) => {
    assert.equal(options.where.recipient_user_id, recipient);
    assert.equal(options.where.is_read, false);
    assert.equal(options.offset, 10);
    assert.deepEqual(options.order, [['created_at', 'DESC'], ['id', 'DESC']]);
    return { rows: [], count: 0 };
  });
  t.mock.method(db.Notification, 'count', async ({ where }) => {
    assert.deepEqual(where, { recipient_user_id: recipient, is_read: false });
    return 3;
  });
  const res = response();
  await listNotifications(request({ page: '2', limit: '10', read: 'unread', recipient_user_id: id }), res);
  assert.equal(res.body.unreadCount, 3);
  await unreadCount(request(), res);
  assert.equal(res.body.unreadCount, 3);
});

test('invalid pagination rejected before database access', async () => {
  for (const query of [{ page: '-1' }, { page: '1x' }, { limit: '101' }, { read: 'invalid' }]) {
    const res = response();
    await listNotifications(request(query), res);
    assert.equal(res.code, 400);
  }
});

test('mark read hides other recipients and is idempotent', async (t) => {
  t.mock.method(db.Notification, 'findOne', async ({ where }) => {
    assert.deepEqual(where, { id, recipient_user_id: recipient });
    return null;
  });
  const res = response();
  await markNotificationRead(request(), res);
  assert.equal(res.code, 404);
  t.mock.restoreAll();
  let updates = 0;
  const row = { is_read: false, async update() { updates++; this.is_read = true; } };
  t.mock.method(db.Notification, 'findOne', async () => row);
  await markNotificationRead(request(), response());
  await markNotificationRead(request(), response());
  assert.equal(updates, 1);
});

test('mark all updates only own unread rows', async (t) => {
  t.mock.method(db.Notification, 'update', async (values, { where }) => {
    assert.deepEqual(values, { is_read: true });
    assert.deepEqual(where, { recipient_user_id: recipient, is_read: false });
    return [2];
  });
  const res = response();
  await markAllNotificationsRead(request(), res);
  assert.equal(res.body.updated, 2);
});

test('producer writes recipient-specific rows with related entity in caller transaction', async (t) => {
  const transaction = { afterCommit() {} };
  t.mock.method(db.User, 'findAll', async (options) => {
    assert.deepEqual(options.where, { role: 'admin', status: 'active' });
    assert.equal(options.transaction, transaction);
    return [{ id: recipient }];
  });
  t.mock.method(db.Notification, 'bulkCreate', async (rows, options) => {
    assert.equal(rows.length, 1);
    assert.equal(rows[0].recipient_user_id, recipient);
    assert.equal(rows[0].related_entity_id, id);
    assert.equal(rows[0].is_read, false);
    assert.equal(options.transaction, transaction);
  });
  await notifyAdmins({ type: NOTIFICATION_TYPES.NEW_ENQUIRY, title: 'New enquiry', related_entity_type: 'enquiry', related_entity_id: id }, { transaction });
});
