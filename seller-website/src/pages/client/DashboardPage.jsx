import React from 'react'
import { Home } from 'lucide-react';
import { DashboardSkeleton } from '../../components/loading/PortalSkeletons';
import { formatDate, formatPriceINR, statusLabel, STATUS_ORDER } from '../../config/constants';

const TIMELINE_STEPS = [
  { key: 'draft', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'active', label: 'Approved' },
  { key: 'sold', label: 'Sold' },
];

const SUPPORT_WHATSAPP = 'https://wa.me/919044936565?text=' + encodeURIComponent('Hi LANDLOGY, I need help with my property.');

function statusIndex(status) {
  const i = STATUS_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}
function stepState(status, stepIndex) {
  const cur = statusIndex(status);
  if (stepIndex < cur) return 'complete';
  if (stepIndex === cur) return 'current';
  return 'pending';
}
function getPrimaryImage(property) {
  return property && (
    property.primary_image
    || (Array.isArray(property.images) && property.images[0] && (property.images[0].url || property.images[0]))
    || property.image_url
  );
}
function countByStatus(properties, status) {
  return (properties || []).filter((p) => (p && p.status) === status).length;
}

export function DashboardPage({ user, properties, loading, error }) {
  const ownerName = user?.name || 'LANDLOGY Client';
  const greetingName = ownerName.split(' ')[0] || 'there';
  const propertyCount = properties.length;
  const featured = propertyCount > 0 ? properties[0] : null;

  const counts = {
    total: propertyCount,
    draft: countByStatus(properties, 'draft'),
    under_review: countByStatus(properties, 'under_review'),
    active: countByStatus(properties, 'active'),
    sold: countByStatus(properties, 'sold'),
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="dash-root">
        <div className="dash-error-box">
          <span className="dash-error-title">Unable to load dashboard</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root">
      <section className="dash-hero">
        <span className="eyebrow">Private Property Portal</span>
        <h1 className="dash-hero-title">Good morning, {greetingName}</h1>
        <p className="dash-hero-sub">
          Your property portfolio, status updates and account information in one secure space.
          Your latest property is <strong>{propertyCount === 0 ? 'not yet recorded' : 'updated in real time'}</strong> below.
        </p>
        <span className="dash-last-sync">Portfolio as of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </section>

      <section className="dash-panel dash-kpi-panel" aria-label="Property summary">
        <div className="dash-kpi"><span className="dash-kpi-value">{counts.total}</span><span className="dash-kpi-label">Total properties</span></div>
        <div className="dash-kpi is-warn"><span className="dash-kpi-value">{counts.under_review}</span><span className="dash-kpi-label">Under review</span></div>
        <div className="dash-kpi is-ok"><span className="dash-kpi-value">{counts.active}</span><span className="dash-kpi-label">Active</span></div>
                <div className="dash-kpi"><span className="dash-kpi-value">{counts.sold}</span><span className="dash-kpi-label">Sold</span></div>
      </section>

      <section className="dash-panel dash-properties-panel">
        <div className="dash-section-head">
          <div>
            <span className="eyebrow">Your portfolio</span>
            <h2 className="dash-section-title">Your Properties</h2>
            <p className="dash-section-sub">Properties currently managed through LANDLOGY.</p>
          </div>
          <a href="/client-portal/properties" className="text-link"><span>View all</span></a>
        </div>

        {propertyCount === 0 ? (
          <div className="dash-empty-state">
            <span className="dash-empty-ico">LANDLOGY</span>
            <h3>No property records yet</h3>
            <p>This account is active, but no seller-owned properties have been returned from the backend.</p>
            <a href="/client-portal/add-property" className="btn btn-primary"><span>+ </span>Add your first property</a>
          </div>
        ) : (
          <>
            <div className="dash-featured-card">
              <div className="dash-featured-media">
                {getPrimaryImage(featured) ? <img src={getPrimaryImage(featured)} alt={featured.title || 'Property'} /> : <div className="property-image-placeholder"><span>🏡</span></div>}
              </div>
              <div className="dash-featured-body">
                <span className="status-pill">{statusLabel(featured.status)}</span>
                <h3 className="dash-featured-title">{featured.title || 'Property'}</h3>
                <p className="dash-featured-loc">{featured.city || featured.address || featured.state || 'Location pending'}</p>
                <div className="dash-featured-fact"><span>Asking price</span><span>{formatPriceINR(featured.asking_price ?? featured.price)}</span></div>
                <div className="dash-featured-fact"><span>Updated</span><span>{formatDate(featured.updated_at || featured.updatedAt)}</span></div>
                <div className="dash-featured-cta">
                  <a href={'/client-portal/properties/' + featured.id} className="btn btn-primary">View property</a>
                </div>
              </div>
            </div>

            {propertyCount > 1 && (
              <div className="dash-property-list">
                {properties.slice(1).map((property) => {
                  const img = getPrimaryImage(property);
                  return (
                    <div key={property.id} className="dash-property-row">
                      <div className="dash-row-thumb">
                        {img ? <img src={img} alt={property.title || 'Property'} /> : <div className="property-image-placeholder small"><span>🏡</span></div>}
                      </div>
                      <div className="dash-row-main">
                        <h4>{property.title || 'Property'}</h4>
                        <p className="dash-row-loc">{property.city || property.address || 'Location pending'}</p>
                      </div>
                      <div className="dash-row-meta">
                        <span className="status-pill">{statusLabel(property.status)}</span>
                        <span className="dash-row-price">{formatPriceINR(property.asking_price ?? property.price)}</span>
                      </div>
                      <a href={'/client-portal/properties/' + property.id} className="dash-row-view" aria-label={'View ' + (property.title || 'property')}>→</a>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="dash-panel dash-split">
        <div className="dash-status-panel">
          <div className="dash-section-head">
            <span className="eyebrow">Your progress</span>
            <h2 className="dash-section-title">Property Status</h2>
            <p className="dash-section-sub">The LANDLOGY team reviews and approves each stage. Status is read-only.</p>
          </div>
          {featured ? (
            <div className="dash-timeline">
              {TIMELINE_STEPS.map((s, i) => {
                const st = stepState(featured.status, i);
                const isDone = st === 'complete';
                const isActive = st === 'current';
                return (
                  <div key={s.key} className={'dash-step ' + (isDone ? 'done ' : '') + (isActive ? 'current ' : '') + (st === 'pending' ? 'pending' : '')}>
                    <div className="dash-step-marker" aria-hidden="true">
                      {isDone ? '✓' : <span className="dash-bullet" />}
                    </div>
                    <div className="dash-step-body">
                      <strong>{s.label}</strong>
                      {isActive && <span className="dash-step-date">{formatDate(featured.updated_at || featured.updatedAt)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="dash-muted">Submit a property to begin tracking its status journey.</p>
          )}
        </div>

        <div className="dash-panel dash-actions-panel">
          <div className="dash-section-head">
            <span className="eyebrow">Quick actions</span>
            <h2 className="dash-section-title">Quick Actions</h2>
          </div>
          <div className="dash-quick-actions">
            <a href="/client-portal/add-property" className="btn btn-primary dash-action"><span>+ </span>Add Property</a>
            <a href="/client-portal/properties" className="btn btn-outline dash-action"><Home size={15} /> View My Properties</a>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noreferrer" className="btn btn-outline dash-action"><span>💬 </span>Contact LANDLOGY</a>
          </div>
        </div>
      </section>
    </div>
  );
}
