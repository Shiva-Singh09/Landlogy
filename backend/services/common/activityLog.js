import db from '../../models/index.js';

// ── Activity recording (Admin "Recent Activity") ─────────────────────
// Append-only history of real backend operations. Recording is
// best-effort and fire-and-forget: a logging failure is logged and
// swallowed so it can never fail (or roll back) the business operation
// that triggered it — matching the existing notifications convention
// in services/common/enquiryService.js.

export const ACTIVITY_ACTIONS = {
  PROPERTY_CREATED: 'property.created',
  PROPERTY_UPDATED: 'property.updated',
  PROPERTY_STATUS_CHANGED: 'property.status_changed',
  PROPERTY_DELETED: 'property.deleted',
  ENQUIRY_STATUS_CHANGED: 'enquiry.status_changed',
  ENQUIRY_CONVERTED: 'enquiry.converted',
  CLIENT_STATUS_CHANGED: 'client.status_changed',
};

const trim = (value, max) => {
  const s = value === undefined || value === null ? '' : String(value);
  return s.length > max ? s.slice(0, max) : s;
};

// Deterministic descriptions — no inference, no generated prose.
export const describeActivity = (action, ctx = {}) => {
  const label = trim(ctx.label, 120);
  switch (action) {
    case ACTIVITY_ACTIONS.PROPERTY_CREATED:
      return `Property "${label}" was created.`;
    case ACTIVITY_ACTIONS.PROPERTY_UPDATED:
      return `Property "${label}" was updated.`;
    case ACTIVITY_ACTIONS.PROPERTY_STATUS_CHANGED:
      return `Property "${label}" status changed from ${trim(ctx.from, 40)} to ${trim(ctx.to, 40)}.`;
    case ACTIVITY_ACTIONS.PROPERTY_DELETED:
      return `Property "${label}" was deleted.`;
    case ACTIVITY_ACTIONS.ENQUIRY_STATUS_CHANGED:
      return `Enquiry from ${label} marked as ${trim(ctx.to, 40)}.`;
    case ACTIVITY_ACTIONS.ENQUIRY_CONVERTED:
      return `Enquiry from ${label} was converted to a client.`;
    case ACTIVITY_ACTIONS.CLIENT_STATUS_CHANGED:
      return `Client ${label} status changed from ${trim(ctx.from, 40)} to ${trim(ctx.to, 40)}.`;
    default:
      return `${trim(action, 60)} — ${label}`;
  }
};

// Returns { action, entity_type, entity_id, description } or null when the
// minimum trustworthy fields (actor, action, entity type) are absent.
export const buildActivityRecord = (action, { actorUserId, entityType, entityId, description } = {}) => {
  if (!action || !entityType || !actorUserId) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(actorUserId))) return null;
  const desc = trim(description, 300);
  if (!desc) return null;
  return {
    actor_user_id: String(actorUserId),
    action: trim(action, 60),
    entity_type: trim(entityType, 30),
    entity_id: entityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(entityId)) ? String(entityId) : null,
    description: desc,
  };
};

// Fire-and-forget. Never throws, never awaited by business paths.
export const recordActivity = (action, ctx = {}) => {
  try {
    const record = buildActivityRecord(action, ctx);
    if (!record) return;
    Promise.resolve(db.ActivityLog.create(record)).catch((err) => {
      console.error('[ACTIVITY] Failed to record activity:', err?.message || err);
    });
  } catch (err) {
    console.error('[ACTIVITY] Failed to record activity:', err?.message || err);
  }
};
