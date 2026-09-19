import { Bell, Building2, MessageSquare, Volume2, VolumeX, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminNotification } from '../../types/notification';
import { notificationTarget } from '../../types/notification';
import { Button } from '../ui/Button';
import { useNotifications, usePushSubscription } from './NotificationContext';
import { useState } from 'react';

export function NotificationItem({ item, compact = false }: {
  item: AdminNotification; compact?: boolean;
}) {
                const { markRead, busy } = useNotifications();
  const navigate = useNavigate();
  const target = notificationTarget(item);
  const Icon = item.related_entity_type === 'enquiry' ? MessageSquare : item.related_entity_type === 'property' ? Building2 : Bell;
  const open = () => { void markRead(item.id); if (target) navigate(target); };
  return (
    <article className={`flex min-w-0 gap-3 rounded-xl p-3 sm:p-4 ${item.is_read ? 'bg-white' : 'bg-land-plum/[0.045]'}`}>
      <Icon size={19} aria-hidden="true" className="mt-1 shrink-0 text-land-plum" />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => void open()} disabled={busy}
          aria-label={`${item.title}${!item.is_read ? ', unread' : ''}${target ? ', view details' : ''}`}
          className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-land-plum/40 disabled:opacity-60">
          <span className="flex items-start gap-2 text-sm font-semibold text-land-ink">
            <span className="min-w-0 break-words">{item.title}</span>
            {!item.is_read && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-land-emerald" />}
          </span>
          {item.message && <span className={`mt-1 block break-words text-sm text-land-ink/65 ${compact ? 'line-clamp-2' : 'whitespace-pre-wrap'}`}>{item.message}</span>}
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-land-ink/60">
          <span>{item.related_entity_type === 'enquiry' ? 'Enquiry' : item.related_entity_type === 'property' ? 'Property' : 'System'}</span>
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
          <span>{item.is_read ? 'Read' : 'Unread'}</span>
        </div>
        {!compact && <div className="mt-2 flex flex-wrap gap-2">
          {target && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void open()}>View details</Button>}
          {!item.is_read && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void markRead(item.id)}>Mark as read</Button>}
        </div>}
      </div>
    </article>
  );
}

export function NotificationControls() {
  const { unreadCount, busy, markAllRead, soundEnabled, toggleSound } = useNotifications();
  const push = usePushSubscription();
  const [loading, setLoading] = useState(false);
  const toggle = async () => {
    if (push.status !== 'granted') return;
    setLoading(true);
    try {
      if (push.subscribed) await push.unsubscribe(); else await push.subscribe();
    } finally { setLoading(false); }
  };
  const label = push.subscribed
    ? 'Browser notifications active'
    : push.status === 'unsupported'
      ? 'Push notifications not supported in this browser'
      : push.status === 'denied'
        ? 'Notifications are blocked in browser settings'
        : push.status === 'granted'
          ? 'Notifications enabled'
          : 'Enable notifications';
  // Muting also re-syncs the stored server flag so push alerts stop too; the
  // subscription itself is reused, never duplicated.
  const onSoundToggle = async () => {
    const nextMuted = soundEnabled;
    toggleSound();
    if (!push.subscribed) return;
    // Only re-sync the stored flag for an existing subscription; never re-prompt here.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    setLoading(true);
    try { await push.subscribe(nextMuted); } finally { setLoading(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="secondary" disabled={!unreadCount || busy} loading={busy} onClick={() => void markAllRead()}>Mark all as read</Button>
    <Button size="sm" variant="ghost" aria-pressed={soundEnabled} className={soundEnabled ? "bg-[#ebf0ff] text-land-blue hover:bg-[#dbe4ff]" : "bg-[#fff1f2] text-land-coral hover:bg-[#ffe1e3]"} onClick={() => void onSoundToggle()}
      leftIcon={soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}>Sound {soundEnabled ? 'on' : 'off'}</Button>
    {push.status !== 'idle' && <Button size="sm" variant="ghost" aria-label={label} disabled={push.status === 'unsupported' || push.status === 'denied' || loading} loading={loading} onClick={toggle} leftIcon={<Bell size={16} />}>{label}</Button>}
    {push.error && <p role="alert" className="w-full text-xs text-land-coral">{push.error}</p>}
  </div>;
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { recent, loading, error, refresh } = useNotifications();
  return <>
    <div className="flex items-center justify-between px-3 py-2">
      <h2 className="text-sm font-bold text-land-ink">Notifications</h2>
      <Button variant="ghost" size="sm" aria-label="Close notifications" onClick={onClose}><X size={16} /></Button>
    </div>
    <div className="px-2 pb-2"><NotificationControls /></div>
    {error && <div role="alert" className="px-3 py-2 text-sm text-land-coral">{error} <Button variant="ghost" size="sm" onClick={() => void refresh()}>Retry</Button></div>}
    <div className="max-h-[min(50vh,360px)] overflow-y-auto overscroll-contain">
      {loading ? <p role="status" className="p-4 text-sm text-land-ink/60">Loading notificationsâ€¦</p> : !recent.length && !error ?
        <p className="p-4 text-sm text-land-ink/60">You're all caught up. New updates will appear here.</p> :
                <ul className="space-y-1">{recent.slice(0, 5).map((item) => <li key={item.id}><NotificationItem item={item} compact /></li>)}</ul>}
    </div>
    <Link to="/notifications" onClick={onClose} className="mt-2 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-land-plum hover:bg-land-stone focus-visible:ring-2 focus-visible:ring-land-plum">View all notifications</Link>
  </>;
}

export function NotificationBanners() {
  const { banners, dismiss } = useNotifications();
  return <aside aria-label="New notifications" aria-live="polite" aria-relevant="additions"
    className="pointer-events-none fixed left-4 right-4 top-20 z-50 max-h-[65vh] overflow-y-auto sm:left-auto sm:w-96">
    {banners.map((item) => <div key={item.id} className="pointer-events-auto mb-3 rounded-2xl border border-land-ink/10 bg-white p-2 shadow-sm motion-safe:animate-[notification-enter_180ms_ease-out]">
            <div className="flex items-start"><div className="min-w-0 flex-1"><NotificationItem item={item} compact /></div>
        <Button variant="ghost" size="sm" aria-label={`Dismiss ${item.title}`} onClick={() => dismiss(item.id)}><X size={16} /></Button>
      </div>
    </div>)}
  </aside>;
}
