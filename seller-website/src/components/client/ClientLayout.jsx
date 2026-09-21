import React, { useEffect, useRef, useState } from 'react';
import { Bell, Home, LayoutDashboard, LogOut, Menu, Phone, Plus, UserRound, X } from 'lucide-react';
import logo from '../../assets/Logo.png';
import landlogyIcon from '../../assets/LandlogyIcon.svg';
import { initialsFor, SUPPORT_CONTACT } from '../../config/constants';
import { navigate, SpaLink } from '../../utils/bus';
import { playSound } from '../../utils/notificationSound';
import { NotificationPopup } from './NotificationPopup';
import { useClientNotifications } from '../../hooks/useClientNotifications';
import { useClientPushSubscription } from '../../hooks/useClientPushSubscription';

const NAV = [
  { label: 'Dashboard', path: '/client-portal', icon: LayoutDashboard },
  { label: 'My properties', path: '/client-portal/properties', icon: Home },
  { label: 'Add property', path: '/client-portal/add-property', icon: Plus },
  { label: 'Profile & support', path: '/client-portal/profile', icon: UserRound }
];

/* routes that still work but aren't in the sidebar */
const EXTRA = [
  { label: 'Property status', path: '/client-portal/status' },
  { label: 'Documents', path: '/client-portal/documents' },
  { label: 'Notifications', path: '/client-portal/notifications' },
  { label: 'Support', path: '/client-portal/support' }
];
const isActive = (path, current) =>
  path === '/client-portal'
    ? current === '/client-portal'
    : current === path || current.startsWith(`${path}/`);

export function ClientLayout({ user, currentPath, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const notif = useClientNotifications({ limit: 4 });
  // Shared push/sound state — the same hook the Profile and Support settings
  // use, so the popup status control always matches those settings.
  const push = useClientPushSubscription();
  const activePath = currentPath || '/client-portal';
  const displayName = user?.name || 'Client';
  const current = [...NAV, ...EXTRA].find((n) => isActive(n.path, activePath));

  // Service-worker messages:
  //  - 'landlogy_push' → a push arrived while the portal tab is focused. The
  //    worker skips its system notification, so the app owns the alert: refresh
  //    the in-app list/badge (a read-only GET — no duplicate rows) and play the
  //    chime when the sound preference is on (the singleton enforces that).
  //  - 'notification_focus' → the seller clicked a system notification and an
  //    existing window was focused; route it inside the SPA. Seller routes only
  //    (must start with /client-portal) — never admin routes.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    const onMessage = (event) => {
      const data = event.data || {};
      if (data.type === 'landlogy_push') {
        notif.refresh({ page: 1, size: 4 });
        playSound();
      } else if (data.type === 'notification_focus') {
        const url = typeof data.url === 'string' ? data.url : '';
        if (url.startsWith('/client-portal')) navigate(url);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [notif.refresh]);

  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.appendChild(tag);
    return () => { try { document.head.removeChild(tag); } catch {} };
  }, []);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); setNotifOpen(false); } };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => { setOpen(false); setNotifOpen(false); }, [currentPath]);

  /* close the popup on any click outside the bell area */
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onPointerDown = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [notifOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navList = (onNavigate) => (
    <nav className="lp-nav">
      {NAV.map(({ label, path, icon: Icon }) => (
        <SpaLink key={path} to={path} onClick={onNavigate}
          className={isActive(path, activePath) ? 'on' : ''}>
          <Icon size={17} /> {label}
        </SpaLink>
      ))}
    </nav>
  );

  const desk = (
    <div className="lp-desk">
      <span className="lp-desk-k"><i /> Advisory desk</span>
      <strong>Your point of contact</strong>
      <p>Questions about a property, a document or a valuation — call or write and we will pick it up.</p>
      <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`}><Phone size={14} /> {SUPPORT_CONTACT.phone}</a>
    </div>
  );

  return (
    <main className="lp">
      <header className="lp-top">
        <div className="lp-top-l">
          <button type="button" className="lp-burger" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <SpaLink to="/" className="lp-logo" aria-label="LANDLOGY home">
            {/* Full wordmark while the topbar is wide; compact LANDLOGY A-symbol
                on the narrow mobile topbar (swapped in portal.css ≤560px). */}
            <img src={logo} alt="LANDLOGY" className="lp-logo-full" />
            <img src={landlogyIcon} alt="" aria-hidden="true" className="lp-logo-mark" />
          </SpaLink>
          {current && <><span className="lp-sep" /><b className="lp-page">{current.label}</b></>}
        </div>

        <div className="lp-top-r">
          <div className="lp-notif" ref={notifRef}>
            <button
              type="button"
              className="lp-icon"
              aria-label={notif.unreadCount > 0 ? `Notifications, ${notif.unreadCount} unread` : 'Notifications'}
              aria-haspopup="dialog"
              aria-expanded={notifOpen}
              aria-controls="lp-notif-popup"
              onClick={() => setNotifOpen((value) => !value)}
            >
              <Bell size={17} />
              {notif.unreadCount > 0 && (
                <span className="lp-notif-badge" aria-hidden="true">
                  {notif.unreadCount > 9 ? '9+' : notif.unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationPopup
                id="lp-notif-popup"
                notifications={notif.notifications}
                unreadCount={notif.unreadCount}
                loading={notif.loading}
                error={notif.error}
                busy={notif.busy}
                onOpen={() => notif.refresh({ page: 1, size: 4 })}
                onRetry={() => notif.refresh({ page: 1, size: 4 })}
                onMarkRead={notif.markRead}
                onMarkAllRead={notif.markAllRead}
                onClose={() => setNotifOpen(false)}
                soundEnabled={push.soundEnabled}
                onToggleSound={push.toggleSound}
                notificationStatus={{
                  pushStatus: push.pushStatus,
                  subscribed: push.subscribed,
                  busy: push.busy,
                  onSubscribe: push.onSubscribe,
                  onUnsubscribe: push.onUnsubscribe
                }}
              />
            )}
          </div>

          <div className="lp-who">
            <span className="lp-av">{initialsFor(displayName)}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Property owner</small>
            </span>
          </div>

          <button type="button" onClick={onLogout} className="lp-out">
            <LogOut size={15} /> <span>Log out</span>
          </button>
        </div>
      </header>

      <div className="lp-shell">
        <aside className="lp-side" aria-label="Portal navigation">
          {navList()}
          {desk}
        </aside>

        {open && (
          <button type="button" className="lp-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
        )}

        <aside className={`lp-drawer ${open ? 'open' : ''}`} aria-label="Portal navigation" aria-hidden={!open}>
          <div className="lp-drawer-top">
            <img src={logo} alt="LANDLOGY" style={{ width: 106 }} />
            <button type="button" className="lp-icon" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={17} />
            </button>
          </div>
          {navList(() => setOpen(false))}
          {desk}
        </aside>

        <div className="lp-main">{children}</div>
      </div>
    </main>
  );
}

export default ClientLayout;