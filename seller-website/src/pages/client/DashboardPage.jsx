import React from 'react';
import {
  AlertCircle, ArrowRight, Building2, CalendarDays, Check, ClipboardCheck,
  Handshake, MapPin, MessageCircle, Plus, RefreshCw
} from 'lucide-react';
import { DashboardSkeleton } from '../../components/loading/PortalSkeletons';
import {
  formatDate, formatPriceINR, resolveImageURL, statusCopy, statusLabel,
  STATUS_ORDER, SUPPORT_CONTACT
} from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const STEPS = [
  { key: 'draft', label: 'Submitted', icon: ClipboardCheck },
  { key: 'under_review', label: 'Under review', icon: RefreshCw },
  { key: 'active', label: 'Approved', icon: Check },
  { key: 'sold', label: 'Sold', icon: Handshake }
];
const OFF_TRACK = ['rejected', 'inactive', 'archived'];

const WA = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent('Hi LANDLOGY, I need help with my property.')}`;

export const refOf = (id) => {
  if (!id) return null;
  const c = String(id).replace(/-/g, '').toUpperCase();
  return `LL-${c.slice(0, 4)}-${c.slice(4, 6)}`;
};

const imageOf = (p) => {
  if (!p) return '';
  const raw = p.primary_image
    || (Array.isArray(p.images) && p.images[0] && (p.images[0].url || p.images[0]))
    || p.image_url;
  return raw ? resolveImageURL(raw) : '';
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const stepOf = (s) => Math.max(0, STATUS_ORDER.indexOf(s));

/* one property's progress row */
function TrackRow({ p }) {
  const off = OFF_TRACK.includes(p.status);
  const idx = stepOf(p.status);
  const loc = [p.city, p.state].filter(Boolean).join(', ');
  const img = imageOf(p);

  return (
    <SpaLink className="lp-prog" to={`/client-portal/properties/${encodeURIComponent(p.id)}`}>
      <div className="lp-prog-top">
        <span className="lp-prog-thumb">
          {img ? <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            : <span className="lp-ph"><Building2 size={19} /></span>}
        </span>
        <div className="lp-prog-id">
          <strong>{p.title || 'Property'}</strong>
          <span><MapPin size={12} /> {loc || 'Location to be confirmed'}</span>
        </div>
        <div className="lp-prog-r">
          <span className={`lp-pill s-${p.status || 'draft'}`}><i />{statusLabel(p.status)}</span>
          <b>{formatPriceINR(p.asking_price ?? p.price)}</b>
        </div>
      </div>

      {off ? (
        <p className="lp-prog-off"><AlertCircle size={14} /> {statusCopy(p.status)}</p>
      ) : (
        <div className="lp-mini" style={{ '--fill': (idx / (STEPS.length - 1)).toFixed(3) }}>
          <span className="lp-mini-fill" aria-hidden="true" />
          {STEPS.map((s, i) => (
            <span className={`lp-mini-n ${i < idx ? 'done' : i === idx ? 'now' : ''}`} key={s.key}>
              <i>{i < idx ? <Check size={11} /> : <s.icon size={11} />}</i>
              <em>{s.label}</em>
            </span>
          ))}
        </div>
      )}
    </SpaLink>
  );
}

export function DashboardPage({ user, properties, loading, error }) {
  const list = Array.isArray(properties) ? properties : [];
  const firstName = String(user?.name || 'there').trim().split(' ')[0] || 'there';

  const n = (s) => list.filter((p) => p?.status === s).length;
  const review = n('under_review');
  const active = n('active');

  const recent = [...list]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 5);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="lp-err" role="alert">
        <AlertCircle size={20} />
        <div><strong>We could not load your portal</strong><p>{error}</p></div>
      </div>
    );
  }

  const summary = list.length === 0
    ? 'Add your first property and our team will take it from there.'
    : review > 0
      ? `${review} propert${review === 1 ? 'y is' : 'ies are'} with our team for review right now.`
      : active > 0
        ? `${active} of your propert${active === 1 ? 'y is' : 'ies are'} live and open to buyers.`
        : 'Everything is up to date. We will call you when there is news.';

  return (
    <>
      <header className="lp-head">
        <div className="lp-head-row">
          <div>
            <span className="lp-k">Owner portal</span>
            <h1>{greeting()}, <em>{firstName}</em></h1>
            <p>{summary}</p>
          </div>
          <span className="lp-stamp">
            <CalendarDays size={13} />
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </header>

      {list.length === 0 ? (
        <section className="lp-card">
          <div className="lp-empty">
            <span className="lp-empty-i"><Building2 size={28} /></span>
            <h3>Let us get started</h3>
            <p>Add your property and our team will review the details, work out a realistic price and come back to you within two to three working days.</p>
            <div className="lp-empty-a">
              <SpaLink to="/client-portal/add-property" className="lp-btn lp-btn-a"><Plus size={15} /> Add a property</SpaLink>
              <a href={WA} target="_blank" rel="noreferrer" className="lp-btn lp-btn-b"><MessageCircle size={15} /> Ask a question first</a>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* one-line stats */}
          <section className="lp-bandline">
            <div><b>{list.length}</b><span>Total</span></div>
            <div className={review ? 'warn' : ''}><b>{review}</b><span>Under review</span></div>
            <div className={active ? 'ok' : ''}><b>{active}</b><span>Active</span></div>
            <div><b>{n('sold')}</b><span>Sold</span></div>
            <SpaLink to="/client-portal/add-property" className="lp-bandline-cta"><Plus size={15} /> Add property</SpaLink>
          </section>

          {/* every property's progress */}
          <section className="lp-card" style={{ marginTop: 'var(--s4)' }}>
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Your progress</span>
                <h2>Where everything stands</h2>
                <p>Updated by the LANDLOGY team as each property moves forward.</p>
              </div>
              <SpaLink to="/client-portal/properties" className="lp-link">All properties <ArrowRight size={14} /></SpaLink>
            </div>

            <div className="lp-proglist">
              {recent.map((p) => <TrackRow key={p.id} p={p} />)}
            </div>

            {list.length > 5 && (
              <p className="lp-quiet" style={{ justifyContent: 'center' }}>
                Showing 5 of {list.length}. <SpaLink to="/client-portal/properties" className="lp-link">See all</SpaLink>
              </p>
            )}
          </section>

          {/* help strip */}
          <section className="lp-helpstrip">
            <div>
              <span className="lp-k">Need something</span>
              <h2>We are one call away</h2>
              <p>Quote your property reference and we will pull up the file straight away.</p>
            </div>
            <div className="lp-helpstrip-a">
              <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`} className="lp-btn lp-btn-b">{SUPPORT_CONTACT.phone}</a>
              <a href={WA} target="_blank" rel="noreferrer" className="lp-btn lp-btn-a"><MessageCircle size={15} /> WhatsApp</a>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default DashboardPage;