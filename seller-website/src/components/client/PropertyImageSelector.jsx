import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, ImageIcon, Upload, X } from 'lucide-react';
import { IMAGE_UPLOAD, formatFileSize } from '../../config/constants';

const ACCEPT = '.jpg,.jpeg,.png,.webp,image/*';

export function PropertyImageSelector({ onSelectionChange, disabled = false }) {
  const [entries, setEntries] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const entriesRef = useRef([]);
  const objectUrlsRef = useRef([]);
  entriesRef.current = entries;

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => { try { URL.revokeObjectURL(url); } catch {} });
  }, []);

  const notify = useCallback((next) => {
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(next.map((e) => ({ file: e.file, isPrimary: e.isPrimary, id: e.id })));
    }
  }, [onSelectionChange]);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0 || disabled) return;
    const existing = new Set(entriesRef.current.map((e) => `${e.file.name}::${e.file.size}`));
    const toAdd = [];
    for (const file of incoming) {
      if (existing.has(`${file.name}::${file.size}`)) continue;
      existing.add(`${file.name}::${file.size}`);
      if (!IMAGE_UPLOAD.SUPPORTED_TYPES.includes(file.type)) continue;
      if (file.size > IMAGE_UPLOAD.MAX_FILE_SIZE) continue;
      let preview = '';
      try { preview = URL.createObjectURL(file); } catch { preview = ''; }
      if (preview) objectUrlsRef.current.push(preview);
      toAdd.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, preview, isPrimary: false });
    }
    if (toAdd.length === 0) return;
    const next = [...entriesRef.current, ...toAdd].slice(0, IMAGE_UPLOAD.MAX_FILES);
    const withPrimary = next.some((e) => e.isPrimary) ? next : next.map((e, i) => ({ ...e, isPrimary: i === 0 }));
    setEntries(withPrimary);
    notify(withPrimary);
  }, [disabled, notify]);

  const removeEntry = useCallback((id) => {
    const target = entriesRef.current.find((e) => e.id === id);
    if (target?.preview) {
      try { URL.revokeObjectURL(target.preview); } catch {}
      objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== target.preview);
    }
    const filtered = entriesRef.current.filter((e) => e.id !== id);
    const next = filtered.some((e) => e.isPrimary) ? filtered : filtered.map((e, i) => ({ ...e, isPrimary: i === 0 }));
    setEntries(next);
    notify(next);
  }, [notify]);
  const setPrimary = useCallback((id) => {
    const next = entriesRef.current.map((e) => ({ ...e, isPrimary: e.id === id }));
    setEntries(next);
    notify(next);
  }, [notify]);

  const openPicker = useCallback(() => {
    if (!disabled && fileInputRef.current) fileInputRef.current.click();
  }, [disabled]);

  return (
    <div className="image-upload-widget">
      <div
        className={`image-drop-zone${dragOver ? ' drag-over' : ''}`}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); addFiles(e.dataTransfer?.files); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onClick={openPicker}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
      >
        <div className="image-drop-inner">
          <Upload size={32} className="image-drop-icon" />
          <p className="image-drop-text">Drag &amp; drop property images here, or click to browse</p>
          <p className="image-drop-hint">JPG, PNG, WebP — up to {formatFileSize(IMAGE_UPLOAD.MAX_FILE_SIZE)} each, max {IMAGE_UPLOAD.MAX_FILES} files</p>
          <span className="btn btn-secondary" style={{ cursor: 'pointer' }}>Choose Images</span>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/*" multiple hidden disabled={disabled} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      {entries.length > 0 && (
        <div className="image-preview-grid">
          {entries.map((entry) => (
            <div key={entry.id} className="image-preview-item">
              {entry.preview ? (
                <img src={entry.preview} alt={entry.file.name} className="image-preview-thumb" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="image-preview-thumb image-placeholder-thumb"><ImageIcon size={28} /></div>
              )}
              <div className="image-preview-meta">
                <span className="image-file-name" title={entry.file.name}>{entry.file.name}</span>
                <span className="image-file-size">{formatFileSize(entry.file.size)}</span>
                {entry.isPrimary && <span className="image-status-badge image-status-primary">Cover</span>}
              </div>
              <div className="image-preview-actions">
                {!entry.isPrimary && (
                  <button type="button" className="image-action-btn" onClick={() => setPrimary(entry.id)} disabled={disabled} title="Set as cover image">
                    <Flag size={12} /> Set cover
                  </button>
                )}
                <button type="button" className="image-action-btn image-action-remove" onClick={() => removeEntry(entry.id)} disabled={disabled} title="Remove this image">
                  <X size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PropertyImageSelector;
