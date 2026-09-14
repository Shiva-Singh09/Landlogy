import React, { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Loader2, Upload, X, CheckCircle, AlertCircle, Flag } from 'lucide-react';
import { uploadClientPropertyImage } from '../../api/clientApi';
import { IMAGE_UPLOAD, formatFileSize } from '../../config/constants';

// Supported file types string for the file input accept attribute.
const ACCEPT = '.jpg,.jpeg,.png,.webp,image/*';

export function PropertyImageUpload({ propertyId, token, onImagesUploaded, onError }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [endpointReady, setEndpointReady] = useState(true);

  // Clean up object URLs when component unmounts or files change.
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.preview && typeof URL !== 'undefined' && URL.revokeObjectURL) {
          URL.revokeObjectURL(f.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // — Validation —

  const validateFile = (file) => {
    if (!IMAGE_UPLOAD.SUPPORTED_TYPES.includes(file.type)) {
      return `Unsupported file type. Allowed: JPG, PNG, WebP.`;
    }
    if (file.size > IMAGE_UPLOAD.MAX_FILE_SIZE) {
      return `${formatFileSize(file.size)} exceeds the 5 MB limit.`;
    }
    return null;
  };

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const existingNames = new Set(files.map((f) => f.file.name + f.file.size));
    const toAdd = [];

    for (const file of incoming) {
      // Duplicate check
      if (existingNames.has(file.name + file.size)) {
        toAdd.push({
          file,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          preview: '',
          status: 'error',
          error: 'This image was already added.',
          progress: 0,
          isPrimary: false,
          uploaded: null,
        });
        continue;
      }
      existingNames.add(file.name + file.size);

      const validationError = validateFile(file);
      const preview = typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(file)
        : '';

      toAdd.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        preview,
        status: validationError ? 'error' : 'pending',
        error: validationError || '',
        progress: 0,
        isPrimary: false,
        uploaded: null,
      });
    }

        setFiles((prev) => [...prev, ...toAdd].slice(0, IMAGE_UPLOAD.MAX_FILES));
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const retryUpload = (fileId) => {
    const fileEntry = files.find((f) => f.id === fileId);
    if (!fileEntry || fileEntry.status === 'uploading') return;

    // Re-validate; unsupported/oversized files can never succeed.
    const validationError = validateFile(fileEntry.file);
    if (validationError) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, error: validationError } : f))
      );
      return;
    }

    // Reset to pending so the auto-upload effect re-tries it.
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending', error: '', progress: 0, uploaded: null }
          : f
      )
    );
  };

  const setPrimary = (fileId) => {
    setFiles((prev) =>
      prev.map((f) => ({ ...f, isPrimary: f.id === fileId }))
    );
  };

  const uploadAll = useCallback(async () => {
    if (!propertyId || !token) {
      if (onError) onError(new Error('Missing property ID or token.'));
      return;
    }

    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);
    const completed = [];
    // Upload each file sequentially (backend accepts single file per request).
    for (const entry of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading', progress: 0, uploaded: null } : f))
      );

      try {
        const uploadedImage = await uploadClientPropertyImage(
          propertyId,
          entry.file,
          token,
          {
            isPrimary: entry.isPrimary,
            onProgress: (percent) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f))
              );
            },
          }
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'uploaded', progress: 100, uploaded: uploadedImage || null }
              : f
          )
        );
        if (uploadedImage) completed.push(uploadedImage);
      } catch (err) {
        if (err?.status === 401 || err?.status === 403 || err?.status === 404) {
          setEndpointReady(false);
          if (onError) onError(err);
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  uploaded: null,
                  error:
                    err?.status === 404
                      ? 'Image upload endpoint not available for this account yet. Please try again later.'
                      : err?.message || 'Upload failed. Please try again.',
                }
              : f
          )
        );
      }
    }

    setUploading(false);
    const completedImages = completed.filter(Boolean);
    if (completedImages.length > 0 && onImagesUploaded) onImagesUploaded(completedImages);
  }, [files, propertyId, token, onError, onImagesUploaded]);

  // Auto-start upload after files are selected.
  useEffect(() => {
    const pending = files.some((f) => f.status === 'pending');
    if (pending && !uploading && propertyId && token) {
      uploadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, uploadAll, uploading, propertyId, token]);

  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const dt = event.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      addFiles(dt.files);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

    const inputId = 'property-image-input';

  const uploadedCount = files.filter((f) => f.status === 'uploaded').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const isUploadingAny = uploading || files.some((f) => f.status === 'uploading');

  return (
    <div className="image-upload-widget">
      {!endpointReady && (
        <div className="image-upload-endpoint-warning" role="alert">
          <AlertCircle size={16} />
          <span>Image upload endpoint is not available for this account. You can continue — images can be added later from the property details page.</span>
        </div>
      )}

      {files.length === 0 && (
        <div
          className="image-drop-zone"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={() => { const el = document.getElementById(inputId); if (el) el.click(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const el = document.getElementById(inputId); if (el) el.click(); } }}
        >
          <div className="image-drop-inner">
            <Upload size={32} className="image-drop-icon" />
            <p className="image-drop-text">
              Drag &amp; drop property images here, or click to browse
            </p>
            <p className="image-drop-hint">
              JPG, PNG, WebP — up to {formatFileSize(IMAGE_UPLOAD.MAX_FILE_SIZE)} each, max {IMAGE_UPLOAD.MAX_FILES} files
            </p>
            <label htmlFor={inputId} className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <input
                id={inputId}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
              />
              Choose Images
            </label>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="image-preview-grid">
          {files.map((entry) => (
            <div key={entry.id} className="image-preview-item" data-status={entry.status}>
              {entry.preview ? (
                <img
                  src={entry.preview}
                  alt={entry.file.name}
                  className="image-preview-thumb"
                  onError={(e) => { (e.target.style.display = 'none'); }}
                />
              ) : (
                <div className="image-preview-thumb image-placeholder-thumb">
                  <ImageIcon size={28} />
                </div>
              )}

              <div className="image-preview-progress">
                {entry.status === 'uploading' && (
                  <div className="image-progress-bar">
                    <div className="image-progress-fill" style={{ width: `${entry.progress}%` }} />
                  </div>
                )}
                {entry.status === 'uploaded' && <CheckCircle size={14} className="image-status-icon image-status-success" />}
                {entry.status === 'error' && <AlertCircle size={14} className="image-status-icon image-status-error" />}
              </div>

              <div className="image-preview-meta">
                <span className="image-file-name" title={entry.file.name}>{entry.file.name}</span>
                <span className="image-file-size">{formatFileSize(entry.file.size)}</span>
                {entry.uploaded && entry.uploaded.is_primary && (
                  <span className="image-status-badge image-status-primary">Cover</span>
                )}
                {entry.isPrimary && entry.status !== 'uploaded' && (
                  <span className="image-status-badge image-status-primary">Will be cover</span>
                )}
                {entry.status === 'uploaded' && (
                  <span className="image-status-badge image-status-uploaded">Uploaded</span>
                )}
              </div>

              {entry.error && <div className="image-error-msg">{entry.error}</div>}

              <div className="image-preview-actions">
                {entry.status === 'error' && (
                  <button
                    type="button"
                    className="image-action-btn"
                    onClick={() => retryUpload(entry.id)}
                    disabled={isUploadingAny}
                    title="Retry upload"
                  >
                    <Loader2 size={12} className={isUploadingAny ? 'spin' : ''} /> Retry
                  </button>
                )}
                {(entry.status === 'pending' || entry.status === 'error') && (
                  <button
                    type="button"
                    className={`image-action-btn${entry.isPrimary ? ' image-action-primary' : ''}`}
                    onClick={() => setPrimary(entry.id)}
                    disabled={isUploadingAny}
                    title="Set as cover image. Applied when this image is uploaded to LANDLOGY."
                  >
                    <Flag size={12} /> {entry.isPrimary ? 'Cover' : 'Set cover'}
                  </button>
                )}
                {entry.status !== 'uploaded' && (
                  <button
                    type="button"
                    className="image-action-btn image-action-remove"
                    onClick={() => removeFile(entry.id)}
                    disabled={entry.status === 'uploading'}
                    title="Remove from list before upload"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && !isUploadingAny && (
        <div className="image-upload-summary" style={{ marginTop: uploadedCount > 0 || errorCount > 0 ? '12px' : '0' }}>
          {uploadedCount > 0 && <span className="image-summary-text">{uploadedCount} of {files.length} uploaded</span>}
          {errorCount > 0 && <span className="image-summary-text image-summary-error">{errorCount} failed</span>}
          {uploadedCount === files.length && uploadedCount > 0 && (
            <span className="image-summary-text image-summary-success">All images uploaded successfully</span>
          )}
        </div>
      )}
    </div>
  );
}


