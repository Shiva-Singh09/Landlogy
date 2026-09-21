import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, Bell, BellOff, Volume2, VolumeX, X } from 'lucide-react';
import { formatDate } from '../../config/constants';
import { SpaLink } from '../../utils/bus';
import { InlineSpinner } from '../loading/InlineSpinner';
import { NotificationPopupSkeleton } from '../loading/PortalSkeletons';

// Seller notification popup + row. Purely presentational: state lives in
// useClientNotifications, so the navbar badge and this popup always show the
// same numbers. Reuses existing portal primitives (.lp-icon, .lp-k, .lp-empty,
// .lp-btn, .lp-btn-b, .lp-link) — no new visual language. The footer controls
// (mark all read / sound / permission status) reuse the same primitives too.

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

// Real permission/push status for the footer control — a clickable toggle where
// the browser allows it. Never hard-codes "enabled": every state comes from the
// browser permission + this browser's push subscription state carried in
// `status`. Disabled states (blocked / unsupported) stay non-actionable with
// guidance instead of pretending a click can grant permission.
function NotificationStatus({ status }) {
  if (!status) return null;
  const { pushStatus, subscribed, busy, onSubscribe, onUnsubscribe } = status;

  if (pushStatus === 'loading') {
    return (
      <span className="lp-notif-pill" role="status" aria-live="polite"><span className="lp-ctl-t">Checking…</span></span>
    );
  }
  if (pushStatus === 'unsupported') {
    return (
      <span className="lp-notif-pill" title="This browser cannot receive LANDLOGY notifications.">
        <BellOff size={13} aria-hidden="true" /> <span className="lp-ctl-t">Unsupported</span>
      </span>
    );
  }
  if (pushStatus === 'error') {
    return (
      <span className="lp-notif-pill" role="status" title="Notification status could not be checked. Please try again later.">
        <BellOff size={13} aria-hidden="true" /> <span className="lp-ctl-t">Unavailable</span>
      </span>
    );
  }
  if (pushStatus === 'denied') {
    return (
      <span className="lp-notif-pill" title="LANDLOGY is blocked in this browser's notification settings. Open your browser settings for this site and set Notifications to Allow.">
        <BellOff size={13} aria-hidden="true" /> <span className="lp-ctl-t">Notifications blocked</span>
      </span>
    );
  }
  if (subscribed) {
    // Enabled → clicking disables push for THIS browser only (existing
    // unsubscribe flow). State updates as soon as the action completes.
    return (
      <button
        type="button"
        className="lp-btn lp-btn-b"
        disabled={busy}
        aria-pressed="true"
        aria-label="Notifications enabled. Disable notifications for this browser."
        title="Notifications are on for this browser. Click to disable."
        onClick={onUnsubscribe}
      >
        {busy
          ? <InlineSpinner label="Disabling…" />
          : <><Bell size={14} /><span className="lp-ctl-t">Notifications enabled</span></>}
      </button>
    );
  }
  // Permission flow starts only from this click — never on page load.
  return (
    <button
      type="button"
      className="lp-btn lp-btn-b"
      disabled={busy}
      aria-label="Enable notifications"
      title="Enable notifications for this browser."
      onClick={onSubscribe}
    >
      {busy
        ? <InlineSpinner label="Enabling…" />
        : <><Bell size={14} /><span className="lp-ctl-t">Enable notifications</span></>}
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
  onMarkAllRead,
  onNotificationClick,
  popTitle = 'Notifications',
  soundEnabled,
  onToggleSound,
  notificationStatus = null
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
    <div className="lp-notif-pop" id={id} role="dialog" aria-label={popTitle}>
      <div className="lp-notif-head">
        <div>
          <span className="lp-k">Updates</span>
          <h2>{popTitle}</h2>
        </div>
        <button type="button" className="lp-icon" aria-label="Close notifications" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {showLoading ? (
        <NotificationPopupSkeleton />
      ) : showError ? (
        <div className="lp-notif-state" role="alert">
          <p>{error}</p>
          <button type="button" className="lp-btn lp-btn-b" onClick={onRetry}>Retry</button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="lp-empty lp-notif-empty">
          <span className="lp-empty-i"><Bell size={24} /></span>
          <h3>You are all caught up</h3>
          <ul className="lp-notif-list">
            {notifications.slice(0, 4).map((item) => (
              <li key={item.id}>
                <NotificationItem item={item} busy={busy} compact onMarkRead={onMarkRead} />
              </li>
            ))}
          </ul>
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
        <div className="lp-notif-controls">
          <button type="button" className="lp-btn lp-btn-b" disabled={busy || unreadCount === 0} onClick={onMarkAllRead}>
            {busy ? <InlineSpinner label="Updating…" /> : <span className="lp-ctl-t">Mark all as read</span>}
          </button>
          {soundEnabled !== undefined && (
            <button
              type="button"
              className="lp-btn lp-btn-b"
              aria-pressed={!!soundEnabled}
              aria-label={soundEnabled ? 'Sound on. Mute the notification sound.' : 'Sound off. Unmute the notification sound.'}
              title={soundEnabled ? 'Notification sound is on' : 'Notification sound is off'}
              onClick={onToggleSound}
            >
              {soundEnabled ? <><Volume2 size={14} /> <span className="lp-ctl-t">Sound on</span></> : <><VolumeX size={14} /> <span className="lp-ctl-t">Sound off</span></>}
            </button>
          )}
          <NotificationStatus status={notificationStatus} />
        </div>
        <div className="lp-notif-more">
          <SpaLink to="/client-portal/notifications" className="lp-link" onClick={onClose}>
            View more notifications <ArrowUpRight size={14} />
          </SpaLink>
        </div>
      </div>
    </div>
  );
}

export default NotificationPopup;
