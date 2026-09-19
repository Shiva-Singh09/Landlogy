import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from '../notifications/NotificationContext';
import { NotificationPanel } from '../notifications/NotificationCenter';
import { clearAuthToken } from "../../services/api/client";

interface TopbarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
  onCollapseToggle: () => void;
}

function isFormTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable === true
  );
}

function Topbar({
  sidebarCollapsed,
  onMenuClick,
  onCollapseToggle,
}: TopbarProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Autofocus the expanded tablet/mobile search field (ref, no DOM query).
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  // Ctrl+K (Win/Linux) / Cmd+K (macOS) focuses search; Escape closes overlays.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        // Never hijack typing inside another editable field.
        if (isFormTarget(e.target)) return;
        e.preventDefault();
        setNotifOpen(false);
        setProfileOpen(false);
        const desktop = desktopSearchRef.current;
        if (desktop && desktop.offsetParent !== null) {
          desktop.focus();
        } else {
          // Tablet/mobile search is collapsed: expand it first, then focus.
          setMobileSearchOpen(true);
        }
        return;
      }
      if (e.key === "Escape") {
        if (mobileSearchOpen || notifOpen || profileOpen) {
          e.preventDefault();
          setMobileSearchOpen(false);
          setNotifOpen(false);
          setProfileOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileSearchOpen, notifOpen, profileOpen]);

  // Clicking outside closes the notification/profile dropdowns.
  useEffect(() => {
    if (!notifOpen && !profileOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [notifOpen, profileOpen]);

  const openNotif = () => {
    setNotifOpen(true);
    setProfileOpen(false);
    setMobileSearchOpen(false);
  };

  const openProfile = () => {
    setProfileOpen(true);
    setNotifOpen(false);
    setMobileSearchOpen(false);
  };

  const openMobileSearch = () => {
    setMobileSearchOpen(true);
    setNotifOpen(false);
    setProfileOpen(false);
  };

  const navigate = useNavigate();

  // Logout reuses the existing token utility: clear the stored admin JWT,
  // then immediately route to /login (replace so /dashboard isn't in history).
  // No auth provider exists yet, so there is no user state to reset here.
  const handleLogout = () => {
    clearAuthToken();
    setProfileOpen(false);
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-land-border bg-white shadow-[0_1px_4px_rgba(0,0,0,.06)]">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8 xl:px-10">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-land-ink/60 transition-all hover:bg-land-plum/[0.07] hover:text-land-plum lg:hidden"
        >
          <Menu size={21} />
        </button>

        <button
          type="button"
          onClick={onCollapseToggle}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-land-ink/55 transition-all hover:bg-land-plum/[0.07] hover:text-land-plum lg:flex"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>

        <div className="hidden min-w-0 sm:block">
          <p className="text-sm font-semibold text-land-ink">
            Admin Workspace
          </p>
          <p className="mt-0.5 text-xs text-land-ink/40">
            Manage your property ecosystem
          </p>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div
            className="hidden h-10 w-full max-w-[280px] items-center gap-2 rounded-xl border border-land-plum/[0.09] bg-white/75 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors focus-within:border-land-plum/30 focus-within:bg-white md:flex"
            title="Press Ctrl+K or Cmd+K to focus search"
          >
            <Search size={17} className="shrink-0 text-land-ink/35" />
            <input
              ref={desktopSearchRef}
              type="search"
              placeholder="Search..."
              aria-label="Global search"
              aria-keyshortcuts="Control+k Meta+k"
              className="min-w-0 flex-1 bg-transparent text-sm text-land-ink outline-none placeholder:text-land-ink/35"
            />
            <kbd className="hidden shrink-0 rounded-md border border-land-ink/10 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-land-ink/35 lg:block">
              Ctrl K
            </kbd>
          </div>

          <button
            type="button"
            onClick={openMobileSearch}
            aria-label="Open search"
            aria-expanded={mobileSearchOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-land-ink/60 transition-all hover:bg-land-plum/[0.07] hover:text-land-plum md:hidden"
          >
            <Search size={20} />
          </button>

          <div ref={notifRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => (notifOpen ? setNotifOpen(false) : openNotif())}
              aria-label={`Notifications, ${unreadCount} unread`}
              aria-expanded={notifOpen}
              aria-controls="notification-panel"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-land-ink/60 transition-all hover:border-land-plum/[0.08] hover:bg-land-plum/[0.06] hover:text-land-plum"
            >
              <Bell size={19} />
              {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-land-coral px-1 text-center text-[10px] font-bold leading-5 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            {notifOpen && (
              <div id="notification-panel" role="region" aria-label="Notifications"
                className="fixed left-4 right-4 top-20 z-40 rounded-2xl border border-land-ink/[0.06] bg-white p-2 shadow-sm sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px] sm:max-w-[calc(100vw-2rem)]">
                <NotificationPanel onClose={() => {
                  setNotifOpen(false);
                  notifRef.current?.querySelector('button')?.focus();
                }} />
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => (profileOpen ? setProfileOpen(false) : openProfile())}
              aria-label="Administrator account menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 pr-2 transition-all hover:border-land-plum/[0.08] hover:bg-land-plum/[0.05]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-land-plum text-xs font-bold text-white shadow-[0_5px_12px_rgba(69,32,107,0.2)]">
                A
              </div>

              <div className="hidden text-left lg:block">
                <p className="text-xs font-bold text-land-ink">Administrator</p>
                <p className="text-[11px] text-land-ink/40">Admin</p>
              </div>

              <ChevronDown
                size={15}
                className="hidden text-land-ink/35 lg:block"
              />
            </button>
            {profileOpen && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-land-ink/[0.06] bg-white p-2 shadow-[0_16px_48px_rgba(25,23,36,0.12)]"
              >
                <div className="px-3 pb-2 pt-2 lg:hidden">
                  <p className="text-sm font-bold text-land-ink">
                    Administrator
                  </p>
                  <p className="mt-0.5 text-xs text-land-ink/45">Admin</p>
                </div>
                <Link
                  to="/account-settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-land-ink transition-colors hover:bg-land-stone"
                >
                  <Settings size={17} className="shrink-0 text-land-ink/45" />
                  Account Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-land-ink transition-colors hover:bg-land-stone"
                >
                  <LogOut size={17} className="shrink-0 text-land-ink/45" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-land-plum/[0.08] px-4 pb-3 pt-3 md:hidden">
          <div className="flex min-h-11 items-center gap-2 rounded-xl border border-land-plum/[0.1] bg-white/80 px-3 shadow-[0_4px_12px_rgba(25,23,36,0.03)]">
            <Search size={17} className="shrink-0 text-land-ink/35" />
            <input
              ref={mobileSearchRef}
              type="search"
              placeholder="Search properties, enquiries..."
              aria-label="Global search"
              aria-keyshortcuts="Control+k Meta+k"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMobileSearchOpen(false);
                }
              }}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-land-ink outline-none placeholder:text-land-ink/35"
            />
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-land-ink/50 transition-colors hover:bg-white hover:text-land-ink"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Topbar;
