import React, { useMemo, useState } from 'react';
import {
  AlertCircle, Building2, Calendar, Check, ClipboardCheck,
  Handshake, MapPin, RefreshCw, ShieldCheck
} from 'lucide-react';
import { EmptyState } from '../../components/client/EmptyState';
import { StatusTimelineSkeleton } from '../../components/loading/PortalSkeletons';
import { refOf } from '../../components/client/PropertyCard';
import { formatDate, formatPriceINR, statusCopy, statusLabel, STATUS_ORDER } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const STAGES = [
  { key: 'draft', label: 'Submitted', icon: ClipboardCheck, note: 'We have your property details.' },
  { key: 'under_review', label: 'Under review', icon: RefreshCw, note: 'Our team is checking details and documents.' },
  { key: 'active', label: 'Approved', icon: Check, note: 'Live with LANDLOGY and open to buyers.' },
  { key: 'sold', label: 'Sold', icon: Handshake, note: 'Sale complete and handed over.' }
];
const OFF_TRACK = ['rejected', 'inactive', 'archived'];

export function PropertyStatusPage({ properties, loading, error }) {
  const list = Array.isArray(properties) ? properties : [];
  const [selectedId, setSelectedId] = useState('');

  const selected = useMemo(() => {
    if (list.length === 0) return null;
    return list.find((p) => String(p.id) === String(selectedId)) || list[0];
  }, [list, selectedId]);

  if (loading) return <StatusTimelineSkeleton />;

  if (error) {
    return (
      <div className="lp-err" role="alert">
        <AlertCircle size={20} />
        <div><strong>Could not load your properties</strong><p>{error}</p></div>
      </div>
    );
  }

  const header = (
    <header className="lp-head">
      <span className="lp-k">Progress</span>
      <h1>Property <em>status</em></h1>
      <p>Follow each property through submission, review, approval and sale.</p>
    </header>
  );

  if (list.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon="properties"
          title="Nothing to track yet"
          description="Once you add a property, this is where you will see exactly which stage it has reached."
          action={<SpaLink to="/client-portal/add-property" className="lp-btn lp-btn-a">Add a property</SpaLink>}
        />
      </>
    );
  }

  const idx = Math.max(0, STATUS_ORDER.indexOf(selected.status));
  const offTrack = OFF_TRACK.includes(selected.status);
  const location = [selected.city, selected.state].filter(Boolean).join(', ');

  return (
    <>
      {header}

      {list.length > 1 && (
        <div className="lp-chips">
          {list.map((p) => (
            <button type="button" key={p.id} onClick={() => setSelectedId(p.id)}
              className={`lp-chip ${String(selected.id) === String(p.id) ? 'on' : ''}`}>
              {p.title || 'Property'}
            </button>
          ))}
        </div>
      )}

      <section className="lp-card">
        <div className="lp-card-head">
          <div className="lp-track-id">
            <span className="lp-track-ico"><Building2 size={19} /></span>
            <div>
              <strong>{selected.title || 'Your property'}</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={12} /> {location || 'Location to be confirmed'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {refOf(selected.id) && <span className="lp-ref">REF {refOf(selected.id)}</span>}
            <span className={`lp-pill s-${selected.status || 'draft'}`}><i />{statusLabel(selected.status)}</span>
          </div>
        </div>

        <div className="lp-facts" style={{ marginBottom: 'var(--s5)' }}>
          <div><small>Asking price</small><b>{formatPriceINR(selected.asking_price ?? selected.price)}</b></div>
          <div><small>Added</small><b>{formatDate(selected.created_at || selected.createdAt)}</b></div>
          <div><small>Last updated</small><b>{formatDate(selected.updated_at || selected.updatedAt)}</b></div>
        </div>

        {offTrack ? (
          <div className="lp-track-note" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
            <AlertCircle size={16} />
            <p>{statusCopy(selected.status)}</p>
          </div>
        ) : (
          <ol className="lp-vtrack">
            {STAGES.map((s, i) => {
              const state = i < idx ? 'done' : i === idx ? 'now' : '';
              const Icon = i < idx ? Check : s.icon;
              return (
                <li className={`lp-vnode ${state}`} key={s.key}>
                  <span className="lp-vdot"><Icon size={15} /></span>
                  <div className="lp-vbody">
                    <b>{s.label}</b>
                    {i === idx ? (
                      <>
                        <time>{formatDate(selected.updated_at || selected.updatedAt)}</time>
                        <p>{statusCopy(selected.status)}</p>
                      </>
                    ) : <span>{s.note}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="lp-quiet">
          <ShieldCheck size={14} /> Status is set by the LANDLOGY team as your property moves forward.
        </p>
      </section>
    </>
  );
}

export default PropertyStatusPage;