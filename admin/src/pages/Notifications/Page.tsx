import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { NotificationControls, NotificationItem } from '../../components/notifications/NotificationCenter';
import { useNotifications } from '../../components/notifications/NotificationContext';
import { listNotifications } from '../../services/api/notificationsApi';
import { ApiError } from '../../services/api/client';
import type { NotificationListResponse } from '../../types/notification';

export default function NotificationsPage() {
  const state = useNotifications();
  const [params, setParams] = useSearchParams();
  const value = Number(params.get('page') || 1);
  const page = Number.isSafeInteger(value) && value > 0 && value <= 1000000 ? value : 1;
  const [result, setResult] = useState<{ page: number; revision: number; data?: NotificationListResponse; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (page === 1) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    listNotifications(page, 20, controller.signal).then((data) => {
      if (active) setResult({ page, revision: state.revision, data });
    }).catch((error: unknown) => {
      if (active) setResult({ page, revision: state.revision, error: error instanceof ApiError ? error.message : 'Unable to load notifications. Please retry.' });
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [page, state.revision, retry]);
  const current = result?.page === page && result.revision === state.revision ? result : null;
  const loading = page === 1 ? state.loading : !current;
  const items = page === 1 ? state.recent : current?.data?.notifications ?? [];
  const total = page === 1 ? state.total : current?.data?.pagination.total ?? state.total;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const error = state.error || (page > 1 ? current?.error : '');
  const refresh = () => { if (page === 1) void state.refresh(); else setRetry((old) => old + 1); };
  return <section>
    <PageHeader title="Notifications" description="Enquiries and property updates that need your attention." actions={<NotificationControls />} />
    <div className="rounded-xl border border-land-border bg-white p-3 shadow-[0_1px_4px_rgba(0,0,0,.06),0_2px_8px_rgba(0,0,0,.04)] sm:p-5" aria-busy={loading}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-land-ink/65">{state.unreadCount} unread · {total} notifications</p>
        <Button variant="secondary" size="sm" disabled={loading} onClick={refresh}>Refresh</Button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-xl bg-land-coral/10 p-3 text-sm text-land-coral">{error}</div>}
      {loading ? <p role="status" className="p-6 text-center text-land-ink/60">Loading notifications…</p> : items.length ?
        <ul className="space-y-2">{items.map((item) => <li key={item.id}><NotificationItem item={item} /></li>)}</ul> : !error ?
        <p className="p-8 text-center text-sm text-land-ink/60">{page > 1 ? 'No notifications on this page. Return to the first page.' : 'No notifications yet. New enquiries and property submissions will appear here.'}</p> : null}
      <nav aria-label="Notification pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-land-border pt-4">
        <span className="text-sm text-land-ink/60">Page {page} of {totalPages}</span>
        <div className="flex flex-wrap gap-2">
          {page > totalPages && <Button variant="secondary" size="sm" onClick={() => setParams({ page: '1' })}>First page</Button>}
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setParams({ page: String(page - 1) })}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setParams({ page: String(page + 1) })}>Next</Button>
        </div>
      </nav>
    </div>
  </section>;
}
