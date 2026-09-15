import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => { const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'A';

  return (
    <div className="admin-layout">
      <header className="top-ribbon">
        <div className="ribbon-left">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
          <div className="sidebar-header">
          <h1>LANDLOGY</h1>
          <span className="sidebar-subtitle">Admin Panel</span>
        </div>
        </div>
        <div className="ribbon-right">
          <span className="ribbon-avatar" aria-hidden="true">{initials}</span>
          <span className="ribbon-user">
            <span className="ribbon-name">{user?.name}</span>
            <span className="ribbon-role">{user?.role}</span>
          </span>
          <button onClick={handleLogout} className="btn-secondary btn-sm ribbon-logout">Logout</button>
        </div>
      </header>
      {open && <button className="nav-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <nav className="sidebar-nav">
          <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation">×</button><NavLink onClick={() => setOpen(false)} to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink onClick={() => setOpen(false)} to="/enquiries" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Enquiries
          </NavLink>
          <NavLink onClick={() => setOpen(false)} to="/properties" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Properties
          </NavLink>
          <NavLink onClick={() => setOpen(false)} to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Settings
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
