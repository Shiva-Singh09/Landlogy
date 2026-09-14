import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImageIcon, MapPin, Plus, Upload } from 'lucide-react';
import { fetchClientProperty } from '../../api/clientApi';
import { PropertyImageUpload } from '../../components/client/PropertyImageUpload';
import { PropertyDetailsSkeleton } from '../../components/loading/PortalSkeletons';
import { formatDate, formatPriceINR, statusLabel, resolveImageURL } from '../../config/constants';

export function PropertyDetailsPage({ propertyId, token, onLogout, fallbackProperties = [] }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

    // Request-loop guard: load only once per propertyId+token change.
  useEffect(() => {
    if (!propertyId) {
      setLoading(false);
      setProperty(null);
      return;
    }

    setLoading(true);
    setError('');
    let active = true;

    const load = async () => {
      try {
        const response = await fetchClientProperty(propertyId, token);
        const nextProperty = response?.property || response?.data || null;
        if (active) {
          setProperty(nextProperty || fallbackProperties.find((item) => String(item.id) === String(propertyId)) || null);
        }
      } catch (err) {
        if (!active) return;
        if (err && (err.status === 401 || err.status === 403)) {
          onLogout();
          return;
        }
        setError('Unable to load this property right now. Please try again later.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [propertyId, token, onLogout, fallbackProperties]);

  // Refresh property after image upload to pick up new gallery.
  const handleImagesUploaded = (images) => {
    setUploadedImages((prev) => [...prev, ...images]);
    if (propertyId && token) {
      fetchClientProperty(propertyId, token)
        .then((response) => {
          const nextProperty = response?.property || response?.data || null;
          if (nextProperty) setProperty(nextProperty);
        })
        .catch(() => {});
    }
  };

    const gallery = useMemo(() => {
    if (!property) return [];
    const imagesRaw = Array.isArray(property.images) ? property.images : [];
    const urls = imagesRaw
      .map((image) => (image && typeof image === 'object' ? image.url || image : image))
      .filter(Boolean)
      .map((url) => (typeof url === 'string' ? resolveImageURL(url) : url));
    // Fallback single image (real backend URL only) for properties created
    // before the gallery endpoint existed.
    if (urls.length === 0 && (property.image_url || property.primary_image)) {
      return [resolveImageURL(property.image_url || property.primary_image)];
    }
    return urls;
  }, [property]);

  if (loading) {
    return <PropertyDetailsSkeleton />;
  }

  if (error) {
    return <div className="portal-section-wrapper"><div className="portal-mini-card" style={{ color: '#7f1d1d', background: '#fff1f2' }}>{error}</div></div>;
  }

  if (!property) {
    return (
      <div className="portal-section-wrapper">
        <div className="portal-mini-card" style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '10px' }}>Property not found</h3>
          <p style={{ margin: 0, color: '#5e6c7b' }}>The selected property is not available for this authenticated account.</p>
        </div>
      </div>
    );
  }

  const location = [property.address, property.city, property.state, property.pincode].filter(Boolean).join(', ');

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Property Details</span>
          <h1>{property.title || 'Property Record'}</h1>
        </div>
        <a href="/client-portal/properties" className="btn btn-secondary"><ArrowLeft size={14} /> Back to properties</a>
      </div>

      <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
        <div className="portal-mini-card" style={{ overflow: 'hidden' }}>
          <div className="property-gallery">
            {gallery.length > 0 ? (
              <div className="property-gallery-grid">
                <div className="property-gallery-main">
                  <img src={gallery[0]} alt={property.title || 'Property'} />
                </div>
                {gallery.length > 1 && (
                  <div className="property-gallery-thumbs">
                    {gallery.slice(1).map((image, index) => (
                      <div className="property-gallery-thumb" key={`${image}-${index}`}>
                        <img src={image} alt={`${property.title || 'Property'} image ${index + 2}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="property-gallery-main">
                <div className="property-image-placeholder">
                  <ImageIcon size={48} />
                  <span>No images uploaded yet</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary property-add-images-btn"
            onClick={() => setShowImageUpload((prev) => !prev)}
          >
            <Plus size={14} /> {showImageUpload ? 'Hide image upload' : 'Add Images'}
          </button>
        </div>

        {showImageUpload && (
          <div className="portal-mini-card" style={{ padding: '28px' }}>
            <div className="section-heading" style={{ marginBottom: '14px' }}>
              <h2 style={{ margin: 0, color: '#192536' }}>Add images to this property</h2>
              <p style={{ margin: '4px 0 0', color: '#5e6c7b', fontSize: '13px' }}>
                Images appear in your gallery only after LANDLOGY confirms the upload.
              </p>
            </div>
            <PropertyImageUpload
              propertyId={propertyId}
              token={token}
              onImagesUploaded={handleImagesUploaded}
            />
            {uploadedImages.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: '#ecfdf3', color: '#037a3c', fontSize: '13px', fontWeight: 500 }}>
                {uploadedImages.length} image{uploadedImages.length === 1 ? '' : 's'} added to this property.
              </div>
            )}
          </div>
        )}

        <div className="portal-mini-card">
          <div className="property-title-row" style={{ alignItems: 'center' }}>
            <div>
              <span className="property-owner-tag">Property overview</span>
              <h3>{property.title || 'Property'}</h3>
              <p><MapPin size={14} /> {location || 'Location not available'}</p>
            </div>
            <span className="status-pill">{statusLabel(property.status)}</span>
          </div>

          <div className="property-facts" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            <span><small>Type</small>{property.property_type || property.property_category || property.type || '—'}</span>
            <span><small>Price</small>{formatPriceINR(property.asking_price ?? property.price)}</span>
            <span><small>Reference</small>{property.reference || property.reference_id || '—'}</span>
            <span><small>Updated</small>{formatDate(property.updated_at || property.updatedAt)}</span>
          </div>
        </div>

        <div className="portal-mini-card">
          <div className="section-heading" style={{ marginBottom: '12px' }}>
            <h2>Property information</h2>
          </div>

          <div className="profile-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div><dt>Address</dt><dd>{property.address || '—'}</dd></div>
            <div><dt>City</dt><dd>{property.city || '—'}</dd></div>
            <div><dt>State</dt><dd>{property.state || '—'}</dd></div>
            <div><dt>Pincode</dt><dd>{property.pincode || '—'}</dd></div>
            <div><dt>Property type</dt><dd>{property.property_type || property.property_category || property.type || '—'}</dd></div>
            <div><dt>Created</dt><dd>{formatDate(property.created_at || property.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{formatDate(property.updated_at || property.updatedAt)}</dd></div>
            <div><dt>Current status</dt><dd>{statusLabel(property.status)}</dd></div>
          </div>
        </div>

        {property.description || property.details ? (
          <div className="portal-mini-card">
            <h3 style={{ marginBottom: '12px', color: '#192536' }}>Description</h3>
            <p style={{ margin: 0, color: '#48596b', lineHeight: 1.8 }}>{property.description || property.details}</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
