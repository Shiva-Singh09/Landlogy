import React, { useEffect, useState } from 'react';
import { Bell, Home, LayoutDashboard, LogOut, Menu, Phone, Plus, UserRound, X } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { initialsFor, SUPPORT_CONTACT } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

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
  const activePath = currentPath || '/client-portal';
  const displayName = user?.name || 'Client';
  const current = [...NAV, ...EXTRA].find((n) => isActive(n.path, activePath));

  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex, nofollow';
    document.head.appendChild(tag);
    return () => { try { document.head.removeChild(tag); } catch {} };
  }, []);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => { setOpen(false); }, [currentPath]);

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
            <img src={logo} alt="LANDLOGY" />
          </SpaLink>
          {current && <><span className="lp-sep" /><b className="lp-page">{current.label}</b></>}
        </div>

        <div className="lp-top-r">
          <SpaLink to="/client-portal/notifications" className="lp-icon" aria-label="Notifications">
            <Bell size={17} />
          </SpaLink>

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