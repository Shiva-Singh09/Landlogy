import React from 'react';
import { MapPin, PencilLine } from 'lucide-react';
import { formatDate, formatPriceINR, statusLabel } from '../../config/constants';

export function PropertyCard({ property, onViewDetails }) {
  const image = property && (property.primary_image || (Array.isArray(property.images) && property.images[0] && (property.images[0].url || property.images[0])) || property.image_url);
  const location = property && [property.address, property.city, property.state].filter(Boolean).join(', ');

  return (
    <article className="owner-property-card">
      <img src={image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80'} alt={property?.title || 'Property'} />
      <div className="owner-property-info">
        <div className="property-title-row">
          <div>
            <span className="property-owner-tag">Owned property</span>
            <h3>{property?.title || 'Property'}</h3>
            <p><MapPin size={14} /> {location || 'Location not available'}</p>
          </div>
          <span className="status-pill">{statusLabel(property?.status)}</span>
        </div>

        <div className="property-facts">
          <span><small>Type</small>{property?.property_type || property?.property_category || property?.type || '—'}</span>
          <span><small>Price</small>{formatPriceINR(property?.asking_price ?? property?.price)}</span>
          <span><small>Updated</small>{formatDate(property?.updated_at || property?.updatedAt)}</span>
          <span><small>Reference</small>{property?.reference || property?.reference_id || '—'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="button" className="btn btn-primary" onClick={() => onViewDetails(property?.id)}>
            <PencilLine size={14} /> View Details
          </button>
        </div>
      </div>
    </article>
  );
}
