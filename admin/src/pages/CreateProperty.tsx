import { FormEvent, useState, useRef, useEffect, useCallback, DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProperty, uploadPropertyImage } from '../api/properties';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface SelectedImage {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export default function CreateProperty() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [form, setForm] = useState({ title: '', description: '', address: '', city: '', state: '', pincode: '', asking_price: '', latitude: '', longitude: '' });
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const handleFilesSelected = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newImages: SelectedImage[] = [];
    Array.from(fileList).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}. Use JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum size is 5 MB.`);
        return;
      }
      const preview = URL.createObjectURL(file);
      objectUrlsRef.current.push(preview);
      newImages.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, file, preview, isPrimary: false, status: 'pending' });
    });
    if (newImages.length > 0) {
      setImages(prev => {
        const combined = [...prev, ...newImages];
        return combined.map((img, i) => ({ ...img, isPrimary: i === 0 }));
      });
    }
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
        objectUrlsRef.current = objectUrlsRef.current.filter(u => u !== target.preview);
      }
      const filtered = prev.filter(img => img.id !== id);
      return filtered.map((img, i) => ({ ...img, isPrimary: i === 0 }));
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }, []);
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleFilesSelected(e.dataTransfer.files); }, [handleFilesSelected]);

  const uploadImages = useCallback(async (propertyId: string, toUpload: SelectedImage[]): Promise<number> => {
    let failCount = 0;
    for (const img of toUpload) {
      setImages(prev => prev.map(x => x.id === img.id ? { ...x, status: 'uploading' as const, error: undefined } : x));
      try {
        await uploadPropertyImage(propertyId, img.file, undefined, img.isPrimary);
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, status: 'uploaded' as const } : x));
      } catch (err) {
        failCount++;
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setImages(prev => prev.map(x => x.id === img.id ? { ...x, status: 'error' as const, error: msg } : x));
      }
    }
    return failCount;
  }, []);

  const retryFailedUploads = useCallback(async () => {
    if (!createdPropertyId) return;
    setUploading(true);
    setImageUploadError('');
    const failedImages = images.filter(img => img.status === 'error');
    const failCount = await uploadImages(createdPropertyId, failedImages);
    setUploading(false);
    if (failCount === 0) {
      navigate(`/properties/${createdPropertyId}`);
    } else {
      setImageUploadError(`Property created, but ${failCount} image${failCount > 1 ? 's' : ''} could not be uploaded.`);
    }
  }, [createdPropertyId, images, uploadImages, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) { setError('Property title must be at least 3 characters.'); return; }
    setBusy(true);
    setError('');
    setImageUploadError('');
    setCreatedPropertyId(null);
    let propertyId: string;
    try {
      const result = await createProperty(form);
      propertyId = result.property.id;
      setCreatedPropertyId(propertyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create property.');
      setBusy(false);
      return;
    }
    if (images.length === 0) { setBusy(false); navigate(`/properties/${propertyId}`); return; }
    setBusy(false);
    setUploading(true);
    const failCount = await uploadImages(propertyId, images);
    setUploading(false);
    if (failCount === 0) {
      navigate(`/properties/${propertyId}`);
    } else {
      setImageUploadError(`Property created, but ${failCount} of ${images.length} image${images.length > 1 ? 's' : ''} could not be uploaded.`);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate('/properties')}>← Back</button>
        <h2>Create property</h2>
        <p>Only fields supported by the current property API are shown.</p>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}
      {imageUploadError && (
        <div className="partial-success-message" role="status">
          <span>{imageUploadError}</span>
          {createdPropertyId && (
            <button type="button" className="btn-secondary btn-sm" onClick={retryFailedUploads} disabled={uploading}>
              {uploading ? 'Retrying…' : 'Retry failed uploads'}
            </button>
          )}
        </div>
      )}

      <form className="detail-card property-form" onSubmit={submit}>
        <div className="detail-section">
          <h3>Property Details</h3>
          <div className="detail-grid">
            {Object.entries(form).map(([key, value]) => (
              <label className="form-group" key={key}>
                {key.replace(/_/g, ' ')}
                {key === 'description' ? (
                  <textarea value={value} onChange={e => setForm({ ...form, [key]: e.target.value })} maxLength={5000} />
                ) : (
                  <input
                    required={key === 'title'}
                    type={['asking_price', 'latitude', 'longitude'].includes(key) ? 'number' : 'text'}
                    value={value}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h3>Property Images</h3>
          <p className="upload-hint">Add photos for this property. JPEG, PNG, or WebP. Max 5 MB each.</p>

          <div
            className={`image-drop-zone${dragOver ? ' drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Choose property images"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => { handleFilesSelected(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              style={{ display: 'none' }}
            />
            <div className="image-drop-icon" aria-hidden="true">+</div>
            <p className="image-drop-text">Drag &amp; drop images here, or click to browse</p>
            <p className="image-drop-hint">JPEG, PNG, WebP — up to 5 MB each</p>
          </div>

          {images.length > 0 && (
            <div className="image-preview-grid">
              {images.map((img) => (
                <div key={img.id} className={`image-preview-item status-${img.status}`}>
                  <img src={img.preview} alt={img.file.name} />
                  {img.isPrimary && <span className="image-badge">Primary</span>}
                  {img.status === 'uploading' && <div className="image-status-overlay">Uploading…</div>}
                  {img.status === 'uploaded' && <div className="image-status-overlay success">✓ Uploaded</div>}
                  {img.status === 'error' && <div className="image-status-overlay error" title={img.error}>Failed</div>}
                  <button type="button" className="image-remove-btn" onClick={() => removeImage(img.id)} disabled={busy || uploading} aria-label={`Remove ${img.file.name}`}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="detail-section">
          <button type="submit" className="btn-primary" disabled={busy || uploading}>
            {busy ? 'Creating…' : uploading ? 'Uploading images…' : 'Create property'}
          </button>
        </div>
      </form>
    </div>
  );
}
