import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard Overview';
    if (path.startsWith('/enquiries/')) return 'Enquiry Details';
    if (path.startsWith('/enquiries')) return 'Seller & Client Enquiries';
    if (path === '/properties/new') return 'Add New Property';
    if (path.startsWith('/properties/')) return 'Property Details';
    if (path.startsWith('/properties')) return 'Properties Inventory';
    return 'Admin Management';
  };

  return (
    <div className="admin-layout">
      {/* Mobile Toggle Button */}
      <button 
        className="mobile-menu" 
        onClick={() => setOpen(true)} 
        aria-label="Open navigation"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Backdrop for Mobile */}
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} role="presentation" />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="mobile-close" 
            onClick={() => setOpen(false)} 
            aria-label="Close navigation"
          >
            &times;
          </button>
          <div className="brand-badge">
            <div className="logo-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div>
              <h1>LAND<span>LOGY</span></h1>
              <span className="sidebar-subtitle">Admin Management</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Navigation</div>

          <NavLink 
            to="/" 
            end 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/enquiries" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Enquiries</span>
          </NavLink>

          <NavLink 
            to="/properties" 
            end
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            <span>Properties</span>
          </NavLink>

          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Quick Actions</div>

          <NavLink 
            to="/properties/new" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Property</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-box">
            <div className="user-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'Admin User'}</span>
              <span className="user-role">{user?.role || 'Administrator'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn logout-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        <header className="top-nav-bar">
          <div className="top-nav-left">
            <div className="top-nav-badge">
              <span className="online-indicator"></span>
              <span>{getPageTitle()}</span>
            </div>
          </div>
          <div className="top-nav-right">
            <a 
              href="http://localhost:3000" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-sm"
              title="Open Public Website"
            >
              <span>View Public Portal</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
