import React from 'react';
import { ArrowUpRight, FileText, Home, MapPin, MessageCircle, TrendingUp, UserRound } from 'lucide-react';
import { DashboardSkeleton } from '../../components/loading/PortalSkeletons';
import { formatDate, formatPriceINR, statusLabel } from '../../config/constants';

function getPrimaryProperty(properties) {
  if (!Array.isArray(properties) || properties.length === 0) return null;
  return properties[0];
}

export function DashboardPage({ user, properties, loading, error }) {
  const ownerName = user?.name || 'LANDLOGY Client';
  const propertyCount = properties.length;
  const highlightedProperty = getPrimaryProperty(properties);
  const currentStatus = highlightedProperty?.status || '—';
  const latestUpdate = highlightedProperty ? formatDate(highlightedProperty.updated_at || highlightedProperty.updatedAt) : 'No updates yet';

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="portal-section-wrapper"><div className="portal-mini-card" style={{ color: '#7f1d1d', background: '#fff1f2' }}>{error}</div></div>;
  }

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Private workspace</span>
          <h1>Welcome back, {ownerName.split(' ')[0]}</h1>
          <p>Track your property portfolio, status updates and account information in one secure dashboard.</p>
        </div>
        <span className="last-synced">Latest sync {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      <section className="portal-overview-grid">
        <div className="portal-status-card">
          <div className="status-card-head">
            <div>
              <span className="eyebrow">Portfolio overview</span>
              <h2>{propertyCount} property{propertyCount === 1 ? '' : 'ies'}</h2>
            </div>
            <div className="status-dot"><Home size={18} /></div>
          </div>

          <p>{propertyCount === 0 ? 'You do not currently have any property records attached to this client account.' : `Your current portfolio is updated with ${propertyCount} property record${propertyCount === 1 ? '' : 's'}.`}</p>

          <div className="status-progress">
            <span style={{ width: propertyCount === 0 ? '0%' : `${Math.min(100, 35 + propertyCount * 25)}%` }} />
          </div>
          <div className="status-progress-labels"><span>Overview</span><strong>{propertyCount === 0 ? 'No properties' : 'Active tracking'}</strong></div>
        </div>

        <div className="portal-mini-card">
          <h3>{propertyCount === 0 ? 'No properties yet' : (highlightedProperty ? highlightedProperty.title : 'Portfolio summary')}</h3>
          <p><MapPin size={12} /> {propertyCount === 0 ? 'Awaiting property records' : (highlightedProperty?.city || highlightedProperty?.address || 'Property location')}</p>

          <dl>
            <div>
              <dt>Current status</dt>
              <dd>{propertyCount === 0 ? '—' : statusLabel(currentStatus)}</dd>
            </div>
            <div>
              <dt>Last update</dt>
              <dd>{latestUpdate}</dd>
            </div>
          </dl>

          <a href={propertyCount === 0 ? '/client-portal/properties' : '/client-portal/properties'} className="text-link"><ArrowUpRight size={12} /> Open property list</a>
        </div>
      </section>

      <section className="portal-lower-grid">
        <div className="portal-profile">
          <div className="section-heading">
            <h2>Quick links</h2>
          </div>
          <div className="profile-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <a href="/client-portal/properties" className="btn btn-secondary" style={{ width: '100%' }}><Home size={15} /> Properties</a>
            <a href="/client-portal/status" className="btn btn-secondary" style={{ width: '100%' }}><TrendingUp size={15} /> Status</a>
            <a href="/client-portal/profile" className="btn btn-secondary" style={{ width: '100%' }}><UserRound size={15} /> Profile</a>
            <a href="/client-portal/support" className="btn btn-secondary" style={{ width: '100%' }}><MessageCircle size={15} /> Support</a>
          </div>
        </div>

        <div className="portal-support">
          <span className="eyebrow">Need help?</span>
          <h2>Stay connected with LANDLOGY</h2>
          <p>Use the support centre for verified contact details, assistance and account information.</p>
          <div className="support-actions">
            <a href="mailto:nextgendevcoders@gmail.com?subject=Client%20portal%20support"><FileText size={14} /> Email support</a>
            <a href="https://wa.me/919044936565?text=Hi%20LANDLOGY%2C%20I%20need%20help%20with%20my%20property." target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
          </div>
        </div>
      </section>

      {propertyCount === 0 ? (
        <div className="portal-section-wrapper">
          <div className="portal-mini-card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '10px' }}>No property records yet</h3>
            <p style={{ margin: '0', color: '#5e6c7b' }}>This account is active, but no seller-owned properties have been returned from the backend.</p>
          </div>
        </div>
      ) : (
        <section className="portal-section">
          <div className="section-heading">
            <h2>Portfolio summary</h2>
            <a href="/client-portal/properties" className="text-link">View all properties</a>
          </div>

          <div className="portal-mini-card">
            <div style={{ display: 'grid', gap: '16px' }}>
              {properties.slice(0, 3).map((property) => (
                <div key={property.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '14px 0', borderBottom: '1px solid #eef0f3' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#192536', fontSize: '15px' }}>{property.title}</strong>
                    <small style={{ color: '#5e6c7b' }}>{property.city || property.address || 'Location pending'}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#192536', fontWeight: 700 }}>{statusLabel(property.status)}</div>
                    <small style={{ color: '#5e6c7b' }}>{formatPriceINR(property.asking_price ?? property.price)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
