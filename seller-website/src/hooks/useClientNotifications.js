import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchClientNotifications,
  markAllClientNotificationsRead,
  markClientNotificationRead
} from '../api/clientApi';

// Seller notification state.
//
// Deliberately lazy and quiet: the list is fetched when the popup opens (and
// when the full notifications page loads) — never on client-portal navigation,
// never on a timer. One list request also returns `unreadCount`, so no second
// count request is issued right after it. Mark actions update local state from
// the server response instead of re-fetching.

export const RECENT_LIMIT = 4;

const friendlyError = (error) => (error && error.code === 'NETWORK'
  ? 'We could not reach LANDLOGY. Please check your connection and try again.'
  : 'We could not load your notifications right now. Please try again in a moment.');

export function useClientNotifications({ limit = RECENT_LIMIT } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const alive = useRef(true);
  const inFlight = useRef(null);
  const mutating = useRef(false);
  const listRef = useRef([]);

  useEffect(() => { listRef.current = notifications; }, [notifications]);
  useEffect(() => () => { alive.current = false; }, []);

  // One in-flight list request at a time — reopening the popup or switching
  // pages can never stack duplicate calls.
  const refresh = useCallback((options = {}) => {
    if (inFlight.current) return inFlight.current;

    const page = Number(options.page) > 0 ? Number(options.page) : 1;
    const size = Number(options.size) > 0 ? Number(options.size) : limit;

    setLoading(true);
    setError('');

    const task = (async () => {
      try {
        const data = await fetchClientNotifications(page, size, 'all');
        if (!alive.current) return;
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnreadCount(Number(data?.unreadCount) || 0);
        setPagination(data?.pagination || null);
      } catch (err) {
        if (!alive.current) return;
        // 401/403 is already handled by the portal shell — stay quiet here.
        if (err?.status === 401 || err?.status === 403) return;
        setError(friendlyError(err));
      } finally {
        if (alive.current) setLoading(false);
        inFlight.current = null;
      }
    })();

    inFlight.current = task;
    return task;
  }, [limit]);

  const markRead = useCallback(async (id) => {
    const target = listRef.current.find((item) => item.id === id);
    if (!id || mutating.current || (target && target.is_read)) return;

    mutating.current = true;
    setBusy(true);
    try {
      await markClientNotificationRead(id);
      if (!alive.current) return;
      setNotifications((items) => items.map((item) => (
        item.id === id && !item.is_read ? { ...item, is_read: true } : item
      )));
      if (target && !target.is_read) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      if (alive.current && err?.status !== 401 && err?.status !== 403) setError(friendlyError(err));
    } finally {
      mutating.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (mutating.current) return;

    mutating.current = true;
    setBusy(true);
    try {
      await markAllClientNotificationsRead();
      if (!alive.current) return;
      setNotifications((items) => items.map((item) => (item.is_read ? item : { ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      if (alive.current && err?.status !== 401 && err?.status !== 403) setError(friendlyError(err));
    } finally {
      mutating.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    busy,
    refresh,
    markRead,
    markAllRead
  };
}

export default useClientNotifications;
