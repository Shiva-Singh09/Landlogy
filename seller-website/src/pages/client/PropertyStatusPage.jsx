import React, { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { StatusTimeline } from '../../components/client/StatusTimeline';
import { EmptyState } from '../../components/client/EmptyState';
import { StatusTimelineSkeleton } from '../../components/loading/PortalSkeletons';
import { formatDate, statusLabel } from '../../config/constants';

export function PropertyStatusPage({ properties, loading, error }) {
  const [selectedId, setSelectedId] = useState(properties[0]?.id || '');

  const selectedProperty = useMemo(() => {
    if (!Array.isArray(properties) || properties.length === 0) return null;
    return properties.find((item) => String(item.id) === String(selectedId)) || properties[0];
  }, [properties, selectedId]);

  if (loading) {
    return <StatusTimelineSkeleton />;
  }

  if (error) {
    return <div className="portal-section-wrapper"><div className="portal-mini-card" style={{ color: '#7f1d1d', background: '#fff1f2' }}>{error}</div></div>;
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return (
      <EmptyState
        title="No property status available"
        description="This client account currently has no properties to inspect."
        icon="properties"
        action={<a href="/client-portal" className="btn btn-primary">Back to dashboard</a>}
      />
    );
  }

  const history = Array.isArray(selectedProperty?.status_history) ? selectedProperty.status_history : [];
  const currentStatus = selectedProperty?.status || 'draft';

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Property Status</span>
          <h1>Portfolio progress</h1>
          <p>Review the current status and real status history for your property records.</p>
        </div>
      </div>

      <section className="portal-section">
        <div className="portal-mini-card" style={{ marginBottom: '18px' }}>
          <div className="section-heading" style={{ marginBottom: '12px' }}>
            <h2>Selected property</h2>
          </div>

          {properties.length > 1 ? (
            <label htmlFor="property-status-select" style={{ display: 'grid', gap: '8px', color: '#48596b', fontWeight: 600 }}>
              Choose a property
              <select id="property-status-select" value={selectedProperty?.id || ''} onChange={(event) => setSelectedId(event.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dfe5eb', background: '#fff' }}>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.title}</option>
                ))}
              </select>
            </label>
          ) : (
            <p style={{ margin: 0, color: '#48596b' }}>{selectedProperty?.title}</p>
          )}
        </div>

        <div className="portal-mini-card" style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Current status</div>
              <h3 style={{ margin: 0, color: '#192536' }}>{statusLabel(currentStatus)}</h3>
            </div>
            <span className="status-pill">{statusLabel(currentStatus)}</span>
          </div>
          <div style={{ marginTop: '18px', display: 'grid', gap: '6px' }}>
            <div style={{ color: '#5e6c7b' }}><CalendarRange size={14} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Latest update: {formatDate(selectedProperty?.updated_at || selectedProperty?.updatedAt)}</div>
            <div style={{ color: '#5e6c7b' }}>Reference: {selectedProperty?.reference || selectedProperty?.reference_id || '—'}</div>
          </div>
        </div>

        <StatusTimeline history={history} currentStatus={currentStatus} />
      </section>
    </>
  );
}
