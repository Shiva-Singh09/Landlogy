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

  return (
    <div className="admin-layout">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
      {open && <button className="nav-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1>LANDLOGY</h1>
          <span className="sidebar-subtitle">Admin Panel</span>
        </div>
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
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary logout-btn">Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
