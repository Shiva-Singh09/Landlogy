import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProperty,
  updatePropertyStatus,
  getPropertyImages,
  uploadPropertyImage,
  deletePropertyImage,
  Property,
  PropertyImage,
} from '../api/properties';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProperty = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [propRes, imgRes] = await Promise.all([
        getProperty(id),
        getPropertyImages(id),
      ]);
      setProperty(propRes.property);
      setImages(imgRes.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to change status to "${newStatus.replace('_', ' ')}"?`)) return;

    setUpdating(true);
    setError('');
    setSuccessMsg('');
    try {
      await updatePropertyStatus(id, newStatus);
      setSuccessMsg(`Property status changed to ${newStatus.replace('_', ' ')} successfully.`);
      await fetchProperty();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please select a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');
    try {
      await uploadPropertyImage(id, file);
      setSuccessMsg('Image uploaded successfully.');
      await fetchProperty();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id || !window.confirm('Delete this image permanently?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await deletePropertyImage(id, imageId);
      setSuccessMsg('Image deleted successfully.');
      await fetchProperty();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image.');
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    const num = parseFloat(price);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div style={{ marginBottom: '1rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
        </div>
        Loading property file...
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button onClick={() => navigate('/properties')} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          &larr; Back to Properties
        </button>
      </div>
    );
  }

  if (!property) {
    return <div className="page-error">Property not found.</div>;
  }

  return (
    <div className="page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/properties')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '0.75rem', gap: 6 }}
          >
            &larr; Back to Properties
          </button>
          <h2>{property.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <span className={`badge badge-${property.status}`}>
              {property.status.replace('_', ' ')}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
              Added on {new Date(property.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.72rem', fontWeight: 800 }}>
            Asking Valuation
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', color: 'var(--indigo)', fontWeight: 400 }}>
            {formatPrice(property.asking_price)}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="success-message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Main Detail Card */}
      <div className="detail-card">
        {/* Basic Property Specs */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Property Specifications
          </h3>

          <div className="detail-grid">
            <div className="detail-item full-width">
              <label>Headline Title</label>
              <span style={{ fontSize: '1.1rem' }}>{property.title}</span>
            </div>

            <div className="detail-item">
              <label>Current Status</label>
              <div>
                <span className={`badge badge-${property.status}`}>
                  {property.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="detail-item">
              <label>Price</label>
              <span className="price-tag" style={{ fontSize: '1.15rem' }}>
                {formatPrice(property.asking_price)}
              </span>
            </div>

            <div className="detail-item">
              <label>City</label>
              <span>{property.city || '-'}</span>
            </div>

            <div className="detail-item">
              <label>State</label>
              <span>{property.state || '-'}</span>
            </div>

            <div className="detail-item">
              <label>Pincode / Postal</label>
              <span>{property.pincode || '-'}</span>
            </div>

            <div className="detail-item">
              <label>Coordinates (Lat, Long)</label>
              <span>
                {property.latitude && property.longitude
                  ? `${property.latitude}, ${property.longitude}`
                  : '-'}
              </span>
            </div>

            {property.address && (
              <div className="detail-item full-width">
                <label>Physical Address</label>
                <span>{property.address}</span>
              </div>
            )}

            {property.description && (
              <div className="detail-item full-width">
                <label>Description & Features</label>
                <div className="message-text" style={{ marginTop: '0.35rem' }}>
                  {property.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Change Listing Lifecycle State
          </h3>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Modify how this property appears to prospective buyers on the portal.
          </p>

          <div className="status-actions">
            <button
              onClick={() => handleStatusUpdate('draft')}
              disabled={updating || property.status === 'draft'}
              className="btn btn-secondary btn-sm"
            >
              Draft
            </button>
            <button
              onClick={() => handleStatusUpdate('under_review')}
              disabled={updating || property.status === 'under_review'}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--amber)', color: '#b37400' }}
            >
              Under Review
            </button>
            <button
              onClick={() => handleStatusUpdate('active')}
              disabled={updating || property.status === 'active'}
              className="btn btn-primary btn-sm"
            >
              ✓ Activate (Publish)
            </button>
            <button
              onClick={() => handleStatusUpdate('sold')}
              disabled={updating || property.status === 'sold'}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}
            >
              Mark Sold
            </button>
            <button
              onClick={() => handleStatusUpdate('rejected')}
              disabled={updating || property.status === 'rejected'}
              className="btn btn-danger btn-sm"
            >
              Reject
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Media & Photos ({images.length})
          </h3>

          <div className="image-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`btn btn-primary ${uploading ? 'disabled' : ''}`}
              style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>{uploading ? 'Uploading Photo...' : 'Upload Image'}</span>
            </label>
            <span className="upload-hint">Supports JPEG, PNG, WebP up to 5MB</span>
          </div>

          {images.length > 0 ? (
            <div className="image-gallery">
              {images.map((img) => (
                <div key={img.id} className="image-item">
                  <img src={img.url} alt={img.caption || property.title} />
                  {img.is_primary && <span className="image-badge">Primary Cover</span>}
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="btn btn-danger btn-sm delete-btn"
                    title="Delete image"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-small">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <div>No photos added to this property yet.</div>
              <div className="text-muted" style={{ marginTop: '0.25rem' }}>Upload high-resolution landscape images to attract buyers.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
