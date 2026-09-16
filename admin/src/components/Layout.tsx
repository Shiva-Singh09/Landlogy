import {
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
  BarChart3,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type NavItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
  unavailable?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Properties',
        to: '/properties',
        icon: Building2,
      },
      {
        label: 'Clients',
        icon: Users,
        unavailable: true,
      },
      {
        label: 'Enquiries',
        to: '/enquiries',
        icon: FileText,
      },
      {
        label: 'Brokers',
        to: '/brokers',
        icon: Users,
        unavailable: true,
      },
      {
        label: 'Leads',
        to: '/leads',
        icon: UserRound,
        unavailable: true,
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics',
        to: '/analytics',
        icon: BarChart3,
        unavailable: true,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Settings',
        to: '/settings',
        icon: Settings,
      },
    ],
  },
];

const getInitials = (name?: string | null) => {
  if (!name) return 'AD';

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userName =
    (user as any)?.name ||
    (user as any)?.full_name ||
    (user as any)?.email ||
    'Administrator';

  const initials = getInitials(userName);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCommandKey = event.ctrlKey || event.metaKey;

      if (isCommandKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!profileOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [profileOpen]);

  useEffect(() => {
    document.body.style.overflow =
      mobileSidebarOpen || searchOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen, searchOpen]);

  return (
    <div className="admin-layout">
      <header className="top-ribbon">
        <div className="ribbon-left">
          <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation">☰</button>
                 <span className="ribbon-brand">LANDLOGY<em>Admin</em></span>
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
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <a className="sidebar-site" href="/" target="_blank" rel="noreferrer">View seller site ↗</a>
          <span className="sidebar-version">LANDLOGY · Phase 1</span>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-w-0 max-w-full lg:col-start-2">
        {/* Header */}
        <header className="admin-header sticky top-0 z-30 h-[76px] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              {/* Desktop collapse */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 lg:flex"
                aria-label={
                  sidebarCollapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
                }
              >
                {sidebarCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>

              {/* Breadcrumb / page context */}
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  LANDLOGY
                </p>
                <p className="truncate text-sm font-semibold text-slate-800">
                  Admin workspace
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="admin-header-actions flex items-center gap-1.5 sm:gap-2">
              {/* Search */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="admin-search-trigger hidden h-11 w-[220px] items-center gap-2.5 rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-left text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700 focus-visible:border-[#c8922a]/70 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8922a]/15 md:flex xl:w-[280px]"
              >
                <Search size={16} />

                <span className="admin-search-placeholder min-w-0 flex-1 truncate text-xs text-slate-400">
                  Search anything...
                </span>

                <kbd className="admin-search-shortcut shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-slate-400 shadow-[0_1px_1px_rgba(15,23,42,0.04)]">
                  ⌘ K
                </kbd>
              </button>

              {/* Mobile search */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:border-[#c8922a]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8922a]/15 md:hidden"
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              {/* Help */}
              <button
                type="button"
                className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:flex"
                aria-label="Help"
              >
                <CircleHelp size={19} />
              </button>

              {/* Notifications */}
              <button
                type="button"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Notifications"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c8922a] ring-2 ring-white" />
              </button>

              <div className="mx-1.5 hidden h-7 w-px bg-slate-200 sm:block" />

              {/* Profile */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100"
                  aria-expanded={profileOpen}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#151f2e] text-xs font-bold text-[#f1d29c]">
                    {initials}
                  </span>

                  <span className="hidden max-w-[130px] text-left lg:block">
                    <span className="block truncate text-xs font-semibold text-slate-800">
                      {userName}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Administrator
                    </span>
                  </span>

                  <ChevronDown
                    size={15}
                    className={[
                      'hidden text-slate-400 transition-transform lg:block',
                      profileOpen ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                    <div className="mb-1 border-b border-slate-100 px-3 py-3">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {userName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Administrator
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Settings size={16} />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 min-h-[calc(100vh-76px)] max-w-full overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>

      {/* Global Search */}
      {searchOpen && (
        <div
          className="admin-search-overlay fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
            }
          }}
        >
          <div className="admin-search-dialog w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <div className="admin-search-input-row flex items-center gap-3 border-b border-slate-100 px-4">
              <Search size={19} className="shrink-0 text-slate-400" />

              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search properties, enquiries, brokers..."
                className="admin-search-input h-14 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              <kbd className="admin-search-escape hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-400 sm:block">
                ESC
              </kbd>

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close search"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-4 py-5">
              <div className="admin-search-caption flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Command size={14} />
                <span>Quick search</span>
              </div>

              <p className="admin-search-description mt-3 text-sm text-slate-500">
                Search across the LANDLOGY admin workspace.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ['Properties', '/properties', Building2],
                  ['Enquiries', '/enquiries', FileText],
                  ['Brokers', '/brokers', Users],
                ].map(([label, path, Icon]) => {
                  const ItemIcon = Icon as LucideIcon;

                  return (
                    <button
                      key={label as string}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(path as string);
                      }}
                      className="admin-search-option flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#c8922a]/40 hover:bg-[#c8922a]/5"
                    >
                      <span className="admin-search-option-icon flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <ItemIcon size={16} />
                      </span>

                      <span className="text-xs font-semibold text-slate-700">
                        {label as string}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
