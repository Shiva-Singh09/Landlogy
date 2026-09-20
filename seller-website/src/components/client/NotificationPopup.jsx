import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, Bell, X } from 'lucide-react';
import { formatDate } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

// Seller notification popup + row. Purely presentational: state lives in
// useClientNotifications, so the navbar badge and this popup always show the
// same numbers. Reuses existing portal primitives (.lp-icon, .lp-k, .lp-empty,
// .lp-btn, .lp-btn-b, .lp-link) — no new visual language.

export function NotificationItem({ item, busy = false, compact = false, onMarkRead }) {
  const unread = !item.is_read;

  return (
    <button
      type="button"
      className={`lp-notif-item ${unread ? 'is-unread' : ''} ${compact ? 'is-compact' : ''}`.trim()}
      disabled={busy || !unread}
      aria-label={unread ? `${item.title} — unread, mark as read` : `${item.title} — read`}
      onClick={() => onMarkRead?.(item.id)}
    >
      <span className="lp-notif-t">
        {unread && <i className="lp-notif-dot" aria-hidden="true" />}
        <span>{item.title}</span>
      </span>
      {item.message && <span className="lp-notif-m">{item.message}</span>}
      <span className="lp-notif-meta">
        <span>{unread ? 'Unread' : 'Read'}</span>
        <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
      </span>
    </button>
  );
}

export function NotificationPopup({
  id = 'lp-notif-popup',
  notifications = [],
  unreadCount = 0,
  loading = false,
  error = '',
  busy = false,
  onOpen,
  onClose,
  onRetry,
  onMarkRead,
  onMarkAllRead
}) {
  // Refresh exactly once per open (not on every parent re-render).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    onOpen?.();
  }, [onOpen]);

  const showLoading = loading && notifications.length === 0;
  const showError = !loading && error && notifications.length === 0;

  return (
    <div className="lp-notif-pop" id={id} role="dialog" aria-label="Notifications">
      <div className="lp-notif-head">
        <div>
          <span className="lp-k">Updates</span>
          <h2>Notifications</h2>
        </div>
        <button type="button" className="lp-icon" aria-label="Close notifications" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {showLoading ? (
        <p className="lp-notif-state" role="status">Loading notifications…</p>
      ) : showError ? (
        <div className="lp-notif-state" role="alert">
          <p>{error}</p>
          <button type="button" className="lp-btn lp-btn-b" onClick={onRetry}>Retry</button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="lp-empty lp-notif-empty">
          <span className="lp-empty-i"><Bell size={24} /></span>
          <h3>You are all caught up</h3>
          <p>When your property moves to a new stage or our team has news, you will see it here.</p>
        </div>
      ) : (
        <ul className="lp-notif-list">
          {notifications.slice(0, 4).map((item) => (
            <li key={item.id}>
              <NotificationItem item={item} busy={busy} compact onMarkRead={onMarkRead} />
            </li>
          ))}
        </ul>
      )}

      <div className="lp-notif-foot">
        <button type="button" className="lp-btn lp-btn-b" disabled={busy || unreadCount === 0} onClick={onMarkAllRead}>
          Mark all as read
        </button>
        <SpaLink to="/client-portal/notifications" className="lp-link" onClick={onClose}>
          View more notifications <ArrowUpRight size={14} />
        </SpaLink>
      </div>
    </div>
  );
}

export default NotificationPopup;
