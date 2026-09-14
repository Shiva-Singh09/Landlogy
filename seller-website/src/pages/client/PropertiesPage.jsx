import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { PropertyCard } from '../../components/client/PropertyCard';
import { EmptyState } from '../../components/client/EmptyState';
import { PropertyCardSkeleton } from '../../components/loading/PortalSkeletons';

export function PropertiesPage({ properties, loading, error, onViewProperty, onAddProperty }) {
  if (loading) {
    return <PropertyCardSkeleton count={3} />;
  }

  if (error) {
    return <div className="portal-section-wrapper"><div className="portal-mini-card" style={{ color: '#7f1d1d', background: '#fff1f2' }}>{error}</div></div>;
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return (
      <EmptyState
        title="No properties available"
        description="This client account does not currently have any seller-owned properties returned by the backend."
        icon="properties"
        action={
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={onAddProperty}><Plus size={14} /> Add Property</button>
            <a href="/client-portal" className="btn btn-secondary"><ArrowRight size={14} /> Return to dashboard</a>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">My Properties</span>
          <h1>Property portfolio</h1>
          <p>Review every property linked to your authenticated seller account.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAddProperty}><Plus size={14} /> Add Property</button>
      </div>

      <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} onViewDetails={onViewProperty} />
        ))}
      </section>
    </>
  );
}
