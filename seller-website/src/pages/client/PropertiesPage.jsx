import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PropertyCard } from '../../components/client/PropertyCard';
import { EmptyState } from '../../components/client/EmptyState';
import { PropertyCardSkeleton } from '../../components/loading/PortalSkeletons';

export function PropertiesPage({ properties, loading, error, onViewProperty }) {
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
        action={<a href="/client-portal" className="btn btn-primary"><ArrowRight size={14} /> Return to dashboard</a>}
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
      </div>

      <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} onViewDetails={onViewProperty} />
        ))}
      </section>
    </>
  );
}
