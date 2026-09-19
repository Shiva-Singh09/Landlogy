import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, Building2, Check, ChevronLeft, ChevronRight,
  ClipboardCheck, Clock, FileText, Handshake, Images, MapPin, MessageCircle,
  Phone, Plus, RefreshCw, ShieldCheck, X
} from 'lucide-react';
import { fetchClientProperty } from '../../api/clientApi';
import { PropertyImageUpload } from '../../components/client/PropertyImageUpload';
import { PropertyDetailsSkeleton } from '../../components/loading/PortalSkeletons';
import { refOf } from '../../components/client/PropertyCard';
import {
  formatDate, formatPriceINR, resolveImageURL, statusCopy, statusLabel,
  STATUS_ORDER, SUPPORT_CONTACT
} from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const STAGES = [
  { key: 'draft', label: 'Submitted', icon: ClipboardCheck, note: 'We have your property details on file.' },
  { key: 'under_review', label: 'Under review', icon: RefreshCw, note: 'Our team checks the details, documents and pricing.' },
  { key: 'active', label: 'Approved', icon: Check, note: 'Live with LANDLOGY and shown to relevant buyers.' },
  { key: 'sold', label: 'Sold', icon: Handshake, note: 'Sale complete and handed over.' }
];
const OFF_TRACK = ['rejected', 'inactive', 'archived'];

const DOCS = ['Title deed', 'Latest tax receipt', 'Identity proof', 'Encumbrance certificate'];

export function PropertyDetailsPage({ propertyId, token, onLogout, fallbackProperties = [] }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(0);

  const fallbackRef = useRef(fallbackProperties);
  fallbackRef.current = fallbackProperties;
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  useEffect(() => {
    if (!propertyId) { setLoading(false); setProperty(null); return; }
    let alive = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await fetchClientProperty(propertyId, token);
        const next = res?.property || res?.data || null;
        if (!alive) return;
        setProperty(next || fallbackRef.current.find((x) => String(x.id) === String(propertyId)) || null);
        setActive(0);
      } catch (err) {
        if (!alive) return;
        if (err && (err.status === 401 || err.status === 403)) { logoutRef.current?.(); return; }
        setError('We could not load this property right now. Please try again in a moment.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [propertyId, token]);

  const gallery = useMemo(() => {
    if (!property) return [];
    const raw = Array.isArray(property.images) ? property.images : [];
    const urls = raw
      .map((i) => (i && typeof i === 'object' ? i.url || i : i))
      .filter(Boolean)
      .map((u) => (typeof u === 'string' ? resolveImageURL(u) : u));
    if (urls.length === 0 && (property.image_url || property.primary_image)) {
      return [resolveImageURL(property.image_url || property.primary_image)];
    }
    return urls;
  }, [property]);

  /* arrow-key navigation through the gallery */
  useEffect(() => {
    if (gallery.length < 2) return;
    const key = (e) => {
      if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + gallery.length) % gallery.length);
      if (e.key === 'ArrowRight') setActive((i) => (i + 1) % gallery.length);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [gallery.length]);

  const onUploaded = (images) => {
    setAdded((n) => n + (images?.length || 0));
    if (!propertyId || !token) return;
    fetchClientProperty(propertyId, token)
      .then((res) => {
        const next = res?.property || res?.data || null;
        if (next) setProperty(next);
      })
      .catch(() => {});
  };

  if (loading) return <PropertyDetailsSkeleton />;

  if (error) {
    return (
      <div className="lp-err" role="alert">
        <AlertCircle size={20} />
        <div><strong>Could not load this property</strong><p>{error}</p></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="lp-card">
        <div className="lp-empty">
          <span className="lp-empty-i"><Building2 size={28} /></span>
          <h3>Property not found</h3>
          <p>This property is not on your account. It may have been removed, or the link may be out of date.</p>
          <div className="lp-empty-a">
            <SpaLink to="/client-portal/properties" className="lp-btn lp-btn-a">Back to my properties</SpaLink>
          </div>
        </div>
      </div>
    );
  }

  const ref = refOf(property.id);
  const address = [property.address, property.city, property.state, property.pincode].filter(Boolean).join(', ');
  const idx = Math.max(0, STATUS_ORDER.indexOf(property.status));
  const off = OFF_TRACK.includes(property.status);
  const type = property.property_type || property.property_category || property.type;
  const wa = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi LANDLOGY, I have a question about my property ${ref ? `(REF ${ref})` : ''}.`)}`;

  return (
    <>
      <div className="lp-backrow">
        <SpaLink to="/client-portal/properties" className="lp-link">
          <ArrowLeft size={14} /> My properties
        </SpaLink>
        {ref && <span className="lp-ref">REF {ref}</span>}
      </div>

      {/* hero */}
      <section className="lp-dhero">
        <div className="lp-dhero-gal">
          {gallery.length > 0 ? (
            <>
              <img src={gallery[active]} alt={property.title || 'Property'} />
              {gallery.length > 1 && (
                <>
                  <button type="button" className="lp-gnav prev" aria-label="Previous photo"
                    onClick={() => setActive((i) => (i - 1 + gallery.length) % gallery.length)}>
                    <ChevronLeft size={18} />
                  </button>
                  <button type="button" className="lp-gnav next" aria-label="Next photo"
                    onClick={() => setActive((i) => (i + 1) % gallery.length)}>
                    <ChevronRight size={18} />
                  </button>
                  <span className="lp-gcount"><Images size={12} /> {active + 1} / {gallery.length}</span>
                </>
              )}
            </>
          ) : (
            <span className="lp-ph lp-dhero-ph">
              <Images size={34} />
              <b>No photos yet</b>
              <small>Buyers take listings with photos far more seriously</small>
              <button type="button" className="lp-btn lp-btn-a" onClick={() => setShowUpload(true)}>
                <Plus size={15} /> Add photos
              </button>
            </span>
          )}
        </div>

        <div className="lp-dhero-info">
          <span className={`lp-pill s-${property.status || 'draft'}`}><i />{statusLabel(property.status)}</span>
          <h1>{property.title || 'Your property'}</h1>
          <p className="lp-dhero-loc"><MapPin size={14} /> {address || 'Address to be confirmed'}</p>

          <div className="lp-dhero-price">
            <small>Asking price</small>
            <b>{formatPriceINR(property.asking_price ?? property.price)}</b>
          </div>

          <dl className="lp-dhero-meta">
            <div><dt>Type</dt><dd>{type || '—'}</dd></div>
            <div><dt>Added</dt><dd>{formatDate(property.created_at || property.createdAt)}</dd></div>
            <div><dt>Updated</dt><dd>{formatDate(property.updated_at || property.updatedAt)}</dd></div>
          </dl>

          <div className="lp-dhero-act">
            <button type="button" className="lp-btn lp-btn-b" onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? <><X size={15} /> Close</> : <><Plus size={15} /> Add photos</>}
            </button>
            <a href={wa} target="_blank" rel="noreferrer" className="lp-btn lp-btn-b">
              <MessageCircle size={15} /> Ask about this
            </a>
          </div>
        </div>
      </section>

      {/* thumbnails */}
      {gallery.length > 1 && (
        <div className="lp-gstrip">
          {gallery.map((src, i) => (
            <button type="button" key={`${src}-${i}`} onClick={() => setActive(i)}
              className={`lp-gthumb ${i === active ? 'on' : ''}`} aria-label={`Photo ${i + 1}`}>
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* upload */}
      {showUpload && (
        <section className="lp-card" style={{ marginTop: 'var(--s4)' }}>
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Photos</span>
              <h2>Add photos to this property</h2>
              <p>Clear daylight photos of the front, main rooms and surroundings work best.</p>
            </div>
            <button type="button" className="lp-icon" aria-label="Close" onClick={() => setShowUpload(false)}>
              <X size={16} />
            </button>
          </div>
          <PropertyImageUpload propertyId={propertyId} token={token} onImagesUploaded={onUploaded} />
          {added > 0 && <p className="lp-ok"><Check size={15} /> {added} photo{added === 1 ? '' : 's'} added.</p>}
        </section>
      )}

      <div className="lp-grid" style={{ marginTop: 'var(--s4)' }}>
        <div>
          {/* description */}
          {(property.description || property.details) && (
            <section className="lp-card">
              <div className="lp-card-head">
                <div>
                  <span className="lp-k">About</span>
                  <h2>Property description</h2>
                </div>
              </div>
              <p className="lp-prose">{property.description || property.details}</p>
            </section>
          )}

          {/* full details */}
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">On record</span>
                <h2>Full details</h2>
                <p>What we hold for this property. Call us if anything needs correcting.</p>
              </div>
            </div>

            <div className="lp-dl">
              {[
                ['Property name', property.title],
                ['Type', type],
                ['Address', property.address],
                ['City', property.city],
                ['State', property.state],
                ['Pincode', property.pincode],
                ['Asking price', formatPriceINR(property.asking_price ?? property.price)],
                ['Reference', ref]
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value || '—'}</b>
                </div>
              ))}
            </div>
          </section>

          {/* documents */}
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Paperwork</span>
                <h2>Documents for this property</h2>
                <p>Our team files these as they are verified.</p>
              </div>
            </div>

            <div className="lp-doclist">
              {DOCS.map((d) => (
                <div key={d}>
                  <span className="lp-doc-i"><FileText size={15} /></span>
                  <b>{d}</b>
                  <span className="lp-doc-s">Awaiting</span>
                </div>
              ))}
            </div>

            <p className="lp-quiet">
              <ShieldCheck size={14} /> Exactly which documents apply depends on the property. We will confirm the list with you during review.
            </p>
          </section>
        </div>

        {/* right rail */}
        <div>
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Progress</span>
                <h2>Where it stands</h2>
              </div>
            </div>

            {off ? (
              <div className="lp-track-note" style={{ marginTop: 0, paddingTop: 0, border: 0 }}>
                <AlertCircle size={16} />
                <p>{statusCopy(property.status)}</p>
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
                            <time>{formatDate(property.updated_at || property.updatedAt)}</time>
                            <p>{statusCopy(property.status)}</p>
                          </>
                        ) : <span>{s.note}</span>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Questions</span>
                <h2>Talk to us</h2>
                <p>Quote REF {ref} and we will open your file straight away.</p>
              </div>
            </div>

            <div className="lp-contact">
              <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`}>
                <span className="lp-contact-i"><Phone size={16} /></span>
                <span><small>Call us</small><strong>{SUPPORT_CONTACT.phone}</strong></span>
              </a>
            </div>

            <a href={wa} target="_blank" rel="noreferrer" className="lp-wa">
              <MessageCircle size={16} /> WhatsApp about this property
            </a>
          </section>
        </div>
      </div>
    </>
  );
}

export default PropertyDetailsPage;