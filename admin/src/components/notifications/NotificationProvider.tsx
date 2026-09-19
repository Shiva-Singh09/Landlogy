import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getAuthToken } from '../../services/api/client';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/api/notificationsApi';
import type { AdminNotification } from '../../types/notification';
import { NotificationContext } from './NotificationContext';
import { useNotificationSound } from './useNotificationSound';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<AdminNotification[]>([]);
  const [banners, setBanners] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const mutation = useRef(false);
  const baseline = useRef<{ time: number; ids: Set<string> } | null>(null);
  const nextAllowed = useRef(0);
  const mounted = useRef(false);
  const sound = useNotificationSound();
  const play = useRef(sound.play);
  useEffect(() => { play.current = sound.play; }, [sound.play]);
  const navigate = useNavigate();
  const reportError = useCallback((err: unknown) => {
    if (!mounted.current) return;
    setError(err instanceof ApiError ? err.message : 'Unable to load notifications. Please retry.');
    if (err instanceof ApiError && err.status === 401) navigate('/login', { replace: true });
    if (err instanceof ApiError && err.status === 429) nextAllowed.current = Date.now() + 60000;
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (pending.current) return pending.current;
    if (!mounted.current || Date.now() < nextAllowed.current || !getAuthToken()) return;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 15000);
    const task = (async () => {
      try {
        const result = await listNotifications(1, 20, abort.signal);
        if (!mounted.current || abort.signal.aborted) return;
        const previous = baseline.current;
        const fresh = previous ? result.notifications.filter((item) => {
          const time = Date.parse(item.created_at);
          return time > previous.time || (time === previous.time && !previous.ids.has(item.id));
        }) : [];
        const time = Math.max(previous?.time ?? 0, ...result.notifications.map((item) => Date.parse(item.created_at)));
        const ids = new Set(previous?.time === time ? previous.ids : []);
        result.notifications.forEach((item) => { if (Date.parse(item.created_at) === time) ids.add(item.id); });
        baseline.current = { time, ids };
        if (fresh.length) {
          setBanners((old) => [...fresh, ...old].filter((item, index, items) => items.findIndex((other) => other.id === item.id) === index).slice(0, 3));
          if (document.visibilityState === 'visible') play.current();
        }
        setRecent(result.notifications); setUnreadCount(result.unreadCount);
        setTotal(result.pagination.total);
        setError(''); setRevision((value) => value + 1);
      } catch (err) {
        if (mounted.current && controller.current === abort) reportError(err);
      } finally {
        window.clearTimeout(timeout);
        if (controller.current === abort) {
          pending.current = null;
          if (mounted.current) setLoading(false);
        }
      }
    })();
    pending.current = task;
    return task;
  }, [reportError]);

  useEffect(() => {
    mounted.current = true;
    const poll = () => { if (document.visibilityState === 'visible' && !mutation.current) void refresh(); };
    poll();
    const interval = window.setInterval(poll, 30000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      mounted.current = false; controller.current?.abort(); pending.current = null;
      window.clearInterval(interval); document.removeEventListener('visibilitychange', poll);
    };
  }, [refresh]);

  const mark = async (id?: string): Promise<boolean> => {
    if (mutation.current || Date.now() < nextAllowed.current) return false;
    mutation.current = true; setBusy(true);
    try {
      await pending.current;
      if (id) await markNotificationRead(id); else await markAllNotificationsRead();
      if (!mounted.current) return false;
      await refresh();
      return true;
    } catch (err) { reportError(err); return false; }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  };
  return <NotificationContext.Provider value={{ recent, banners, unreadCount, total, loading, error, busy, revision, refresh,
    markRead: (id) => mark(id), markAllRead: () => mark(),
    dismiss: (id) => setBanners((items) => items.filter((item) => item.id !== id)),
    soundEnabled: sound.enabled, toggleSound: sound.toggle,
  }}>{children}</NotificationContext.Provider>;
}
