import React, { useEffect, useState } from 'react';
import { Bell, CircleHelp, FileText, Home, LayoutDashboard, LogOut, Menu, MessageCircle, TrendingUp, UserRound, X } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { initialsFor } from '../../config/constants';

const navItems = [
  { label: 'Dashboard', path: '/client-portal', icon: LayoutDashboard },
  { label: 'My Properties', path: '/client-portal/properties', icon: Home },
  { label: 'Property Status', path: '/client-portal/status', icon: TrendingUp },
  { label: 'Documents', path: '/client-portal/documents', icon: FileText },
  { label: 'Notifications', path: '/client-portal/notifications', icon: Bell },
  { label: 'Profile', path: '/client-portal/profile', icon: UserRound },
  { label: 'Support', path: '/client-portal/support', icon: MessageCircle }
];

export function ClientLayout({ user, currentPath, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const activePath = currentPath || '/client-portal';
  const displayName = user?.name || 'LANDLOGY Client';

  return (
    <main className="portal-page">
      <header className="portal-topbar">
        <a href="/" className="portal-logo">
          <img src={logo} alt="LANDLOGY" />
          <span>Client Portal</span>
        </a>

        <div className="portal-top-actions">
          <button type="button" className="icon-button" aria-label="Notifications">
            <Bell size={18} />
            <i />
          </button>

          <div className="portal-account">
            <span className="account-avatar">{initialsFor(displayName)}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Property owner</small>
            </span>
          </div>

          <button type="button" onClick={onLogout} className="portal-logout">
            <LogOut size={16} /> <span>Log out</span>
          </button>

          <button type="button" className="portal-mobile-trigger" aria-label="Open side menu" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>
        </div>
      </header>

      <div className="portal-shell">
        <aside className="portal-sidebar" aria-label="Client portal navigation">
          <div className="sidebar-context">
            <span className="eyebrow">Private workspace</span>
            <strong>{user?.accountId || user?.account_id || user?.reference || 'Client workspace'}</strong>
          </div>

          <nav>
            {navItems.map(({ label, path, icon: Icon }) => {
              const active = path === '/client-portal'
                ? activePath === '/client-portal'
                : activePath === path || activePath.startsWith(`${path}/`);

              return (
                <a key={path} href={path} className={active ? 'active' : ''}>
                  <Icon size={17} /> {label}
                </a>
              );
            })}
          </nav>

          <button type="button" onClick={onLogout} className="sidebar-logout">
            <LogOut size={17} /> Log out
          </button>
        </aside>

        {mobileOpen && <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', zIndex: 40, border: 'none' }} />}

        <aside className={`portal-sidebar mobile-drawer ${mobileOpen ? 'open' : ''}`} aria-label="Mobile client menu" aria-expanded={mobileOpen}>
          <div className="mobile-drawer-head">
            <a href="/" className="portal-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={logo} alt="LANDLOGY" style={{ width: '100px' }} />
            </a>
            <button type="button" onClick={() => setMobileOpen(false)} className="icon-button" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <nav>
            {navItems.map(({ label, path, icon: Icon }) => {
              const active = path === '/client-portal'
                ? activePath === '/client-portal'
                : activePath === path || activePath.startsWith(`${path}/`);

              return (
                <a key={path} href={path} className={active ? 'active' : ''} onClick={() => setMobileOpen(false)}>
                  <Icon size={17} /> {label}
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="portal-content">{children}</div>
      </div>
    </main>
  );
}
