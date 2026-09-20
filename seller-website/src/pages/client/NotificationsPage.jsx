import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { SUPPORT_CONTACT } from '../../config/constants';
import { SpaLink } from '../../utils/bus';
import { EmptyState } from '../../components/client/EmptyState';
import { NotificationItem } from '../../components/client/NotificationPopup';
import { useClientNotifications } from '../../hooks/useClientNotifications';

const WA = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent('Hi LANDLOGY, I have a question about my property.')}`;
const PAGE_SIZE = 10;

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const {
    notifications, unreadCount, pagination, loading, error, busy,
    refresh, markRead, markAllRead
  } = useClientNotifications({ limit: PAGE_SIZE });

  const load = useCallback((nextPage) => { refresh({ page: nextPage, size: PAGE_SIZE }); }, [refresh]);

  useEffect(() => { load(page); }, [load, page]);

  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;
  const isEmpty = !loading && !error && notifications.length === 0;

  return (
    <>
      <header className="lp-head">
        <span className="lp-k">Updates</span>
        <h1>Your <em>notifications</em></h1>
        <p>Updates about your properties will appear here.</p>
      </header>

      <div className="lp-grid">
        {isEmpty ? (
          <EmptyState
            icon="notifications"
            title="You are all caught up"
            description="There is nothing new right now. When your property moves to a new stage or our team has news, you will see it here."
            action={<SpaLink to="/client-portal/status" className="lp-btn lp-btn-b">Check property status</SpaLink>}
          />
        ) : (
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Inbox</span>
                <h2>Recent updates</h2>
                <p>
                  {total > 0
                    ? `${total} update${total === 1 ? '' : 's'}${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`
                    : 'Nothing new right now.'}
                </p>
              </div>
              <button type="button" className="lp-btn lp-btn-b" disabled={busy || unreadCount === 0} onClick={markAllRead}>
                Mark all as read
              </button>
            </div>

            {loading ? (
              <p className="lp-notif-state" role="status">Loading notifications…</p>
            ) : error ? (
              <div className="lp-notif-state" role="alert">
                <p>{error}</p>
                <button type="button" className="lp-btn lp-btn-b" onClick={() => load(page)}>Retry</button>
              </div>
            ) : (
              <>
                <ul className="lp-notif-list is-page">
                  {notifications.map((item) => (
                    <li key={item.id}>
                      <NotificationItem item={item} busy={busy} onMarkRead={markRead} />
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <div className="lp-notif-pager">
                    <button type="button" className="lp-btn lp-btn-b"
                      disabled={busy || loading || page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}>
                      <ChevronLeft size={15} /> Newer
                    </button>
                    <span className="lp-notif-pageno">Page {page} of {totalPages}</span>
                    <button type="button" className="lp-btn lp-btn-b"
                      disabled={busy || loading || page >= totalPages}
                      onClick={() => setPage((value) => value + 1)}>
                      Older <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Meanwhile</span>
              <h2>We will also call you</h2>
              <p>Anything important comes by phone, not just here.</p>
            </div>
          </div>

          <div className="lp-contact">
            <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`}>
              <span className="lp-contact-i"><Phone size={16} /></span>
              <span><small>Call us</small><strong>{SUPPORT_CONTACT.phone}</strong></span>
            </a>
            <a href={`mailto:${SUPPORT_CONTACT.email}`}>
              <span className="lp-contact-i"><Mail size={16} /></span>
              <span><small>Email</small><strong>{SUPPORT_CONTACT.email}</strong></span>
            </a>
          </div>

          <a href={WA} target="_blank" rel="noreferrer" className="lp-wa">
            <MessageCircle size={16} /> WhatsApp us
          </a>
        </section>
      </div>
    </>
  );
}

export default NotificationsPage;