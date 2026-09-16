import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProperty, updatePropertyStatus, getPropertyImages, uploadPropertyImage, deletePropertyImage, Property, PropertyImage } from '../api/properties';

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
      const [propRes, imgRes] = await Promise.all([getProperty(id), getPropertyImages(id)]);
      setProperty(propRes.property);
      setImages(imgRes.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperty(); }, [id]);
  const handleStatusUpdate = async (newStatus: string) => {
    if (!id || !confirm(`Change status to "${newStatus}"?`)) return;
    setUpdating(true);
    setError('');
    setSuccessMsg('');
    try {
      await updatePropertyStatus(id, newStatus);
      setSuccessMsg('Status updated successfully');
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
    if (!allowedTypes.includes(file.type)) { setError('Unsupported file type.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return; }
    setUploading(true);
    setError('');
    setSuccessMsg('');
    try {
      await uploadPropertyImage(id, file);
      setSuccessMsg('Image uploaded successfully');
      await fetchProperty();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id || !confirm('Delete this image?')) return;
    setError('');
    setSuccessMsg('');
    try {
      await deletePropertyImage(id, imageId);
      setSuccessMsg('Image deleted successfully');
      await fetchProperty();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };
  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    const num = parseFloat(price);
    if (num >= 10000000) return `\u20B9${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `\u20B9${(num / 100000).toFixed(2)} L`;
    return `\u20B9${num.toLocaleString()}`;
  };

  if (loading) return <div className="page-loading">Loading property...</div>;
  if (error && !property) return <div className="page-error">{error}</div>;
  if (!property) return <div className="page-error">Property not found</div>;

  return (
    <section className="property-detail-page">
      <header className="property-detail-header">
        <button onClick={() => navigate('/properties')} className="property-back">&larr; Back to Properties</button>
        <div className="property-detail-title-row">
          <div><h1>{property.title}</h1><p>{[property.address, property.city, property.state].filter(Boolean).join(', ') || 'Location not set'}</p></div>
          <span className={`properties-status is-${property.status}`}>{property.status === 'under_review' ? 'Pending' : property.status.replace('_', ' ')}</span>
        </div>
      </header>
      {successMsg && <div className="success-message">{successMsg}</div>}
      {error && <div className="error-message">{error}</div>}
      <section className="property-detail-gallery">
        {images.length > 0 ? <div className="property-gallery-grid">{images.map((img, index) => <div key={img.id} className={`property-gallery-image ${index === 0 ? 'is-primary' : ''}`}><img src={img.url} alt={img.caption || property.title} />{img.is_primary && <span className="image-badge">Primary</span>}<button onClick={() => handleDeleteImage(img.id)} className="btn-danger btn-sm delete-btn">Delete</button></div>)}</div> : <div className="property-gallery-empty">No property images yet</div>}
      </section>
      <div className="property-detail-columns">
        <section className="property-detail-card">
          <h2>Property Information</h2>
          <div className="detail-grid">
            <div className="detail-item full-width"><label>Title</label><span>{property.title}</span></div>
            <div className="detail-item"><label>Price</label><span>{formatPrice(property.asking_price)}</span></div>
            <div className="detail-item"><label>City</label><span>{property.city || '-'}</span></div>
            <div className="detail-item"><label>State</label><span>{property.state || '-'}</span></div>
            <div className="detail-item"><label>Address</label><span>{property.address || '-'}</span></div>
            <div className="detail-item"><label>Pincode</label><span>{property.pincode || '-'}</span></div>
          </div>
        </section>
        <section className="property-detail-card property-seller-card"><h2>Seller / Client Information</h2><div className="detail-grid"><div className="detail-item full-width"><label>Owner ID</label><span className="property-owner-id">{property.owner_id || '-'}</span></div><div className="detail-item"><label>Reviewed by</label><span>{property.reviewed_by || '-'}</span></div></div></section>
      </div>
      {property.description && <section className="property-detail-card property-description"><h2>Description</h2><p>{property.description}</p></section>}
      <section className="property-detail-card property-status-card">
          <h2>Update Status</h2>
          <div className="status-actions">
            <button onClick={() => handleStatusUpdate('draft')} disabled={updating || property.status === 'draft'} className="btn-secondary btn-sm">Draft</button>
            <button onClick={() => handleStatusUpdate('under_review')} disabled={updating || property.status === 'under_review'} className="btn-secondary btn-sm">Review</button>
            <button onClick={() => handleStatusUpdate('active')} disabled={updating || property.status === 'active'} className="btn-primary btn-sm">Activate</button>
            <button onClick={() => handleStatusUpdate('rejected')} disabled={updating || property.status === 'rejected'} className="btn-danger btn-sm">Reject</button>
            <button onClick={() => handleStatusUpdate('sold')} disabled={updating || property.status === 'sold'} className="btn-secondary btn-sm">Sold</button>
          </div>
      </section>
      <section className="property-detail-card property-images-card">
          <h2>Images ({images.length})</h2>
          <div className="image-upload-section">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} id="image-upload" />
            <label htmlFor="image-upload" className={`btn-primary ${uploading ? 'disabled' : ''}`}>{uploading ? 'Uploading...' : 'Upload Image'}</label>
            <span className="upload-hint">JPEG, PNG, WebP. Max 5MB.</span>
          </div>
      </section>
    </section>
  );
}
