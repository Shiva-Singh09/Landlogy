import React from 'react';
import { ArrowRight, Building2, Clock, Images, MapPin } from 'lucide-react';
import { formatDate, formatPriceINR, resolveImageURL, statusLabel } from '../../config/constants';

export const refOf = (id) => {
  if (!id) return null;
  const c = String(id).replace(/-/g, '').toUpperCase();
  return `LL-${c.slice(0, 4)}-${c.slice(4, 6)}`;
};

export const imageOf = (p) => {
  if (!p) return '';
  const raw = p.primary_image
    || (Array.isArray(p.images) && p.images[0] && (p.images[0].url || p.images[0]))
    || p.image_url;
  return raw ? resolveImageURL(raw) : '';
};

const STEPS = ['draft', 'under_review', 'active', 'sold'];
const OFF_TRACK = ['rejected', 'inactive', 'archived'];

export function PropertyCard({ property, onViewDetails }) {
  const p = property || {};
  const img = imageOf(p);
  const location = [p.city, p.state].filter(Boolean).join(', ');
  const type = p.property_type || p.property_category || p.type;
  const shots = Array.isArray(p.images) ? p.images.length : 0;
  const idx = Math.max(0, STEPS.indexOf(p.status));
  const off = OFF_TRACK.includes(p.status);

  return (
    <article className="lp-pc">
      <button type="button" className="lp-pc-hit" onClick={() => onViewDetails(p.id)}
        aria-label={`View ${p.title || 'property'}`} />

      <div className="lp-pc-shot">
        {img
          ? <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          : <span className="lp-ph"><Building2 size={32} /></span>}
        <span className={`lp-pill s-${p.status || 'draft'}`}><i />{statusLabel(p.status)}</span>
        <span className="lp-pc-bottom">
          {refOf(p.id) && <span className="lp-pc-ref">{refOf(p.id)}</span>}
          {shots > 0 && <span className="lp-pc-shots"><Images size={12} /> {shots}</span>}
        </span>
      </div>

      <div className="lp-pc-body">
        <span className="lp-pc-loc"><MapPin size={12} /> {location || 'Location to be confirmed'}</span>
        <h3>{p.title || 'Property'}</h3>

        <div className="lp-pc-price">
          <small>Asking price</small>
          <b>{formatPriceINR(p.asking_price ?? p.price)}</b>
          {type && <span className="lp-pc-type">{type}</span>}
        </div>

        {off ? (
          <p className="lp-pc-off">Speak with us about the next steps</p>
        ) : (
          <div className="lp-pc-bar" style={{ '--fill': (idx / (STEPS.length - 1)).toFixed(3) }}>
            <span />
            <em>{statusLabel(p.status)} · step {idx + 1} of 4</em>
          </div>
        )}

        <div className="lp-pc-foot">
          <time><Clock size={12} /> {formatDate(p.updated_at || p.updatedAt)}</time>
          <span className="lp-pc-go">View <ArrowRight size={14} /></span>
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;