export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const SUPPORT_CONTACT = {
  phone: '+91 9044936565',
  phoneRaw: '+919044936565',
  email: 'nextgendevcoders@gmail.com'
};

export const STATUS_ORDER = ['draft', 'under_review', 'active', 'sold'];

export const STATUS_LABELS = {
  draft: 'Draft',
  under_review: 'Under review',
  active: 'Active',
  rejected: 'Not approved',
  inactive: 'Paused',
  sold: 'Sold',
  archived: 'Archived'
};

export const STATUS_COPY = {
  draft: 'Your property draft is saved with LANDLOGY. We will review it and update this space.',
  under_review: 'Our team is reviewing your property details and submitted documents. We will update this space as the review progresses.',
  active: 'Your property is active with LANDLOGY. Your relationship manager will keep you updated on next steps.',
  rejected: 'This property was not approved for the next stage. Please speak with LANDLOGY to understand the next steps.',
  inactive: 'This property is currently paused. Please contact LANDLOGY for details.',
  sold: 'This property journey is complete. Thank you for trusting LANDLOGY.',
  archived: 'This property record has been archived. Please contact LANDLOGY for details.'
};

export const statusLabel = (value) => STATUS_LABELS[value] || 'In progress';
export const statusCopy = (value) => STATUS_COPY[value] || 'Follow your property journey here. LANDLOGY will update this space as things progress.';

export const supportWhatsapp = () => `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace('+', '')}?text=${encodeURIComponent('Hi LANDLOGY, I need help with my property.')}`;

export const formatPriceINR = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  if (number >= 1e7) return `₹${(number / 1e7).toFixed(2)} Cr`;
  if (number >= 1e5) return `₹${(number / 1e5).toFixed(2)} L`;
  return `₹${number.toLocaleString('en-IN')}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Image upload rules — mirrored from backend (config/upload.js).
// Allowed MIME types: image/jpeg, image/png, image/webp; Max file size: 5 MB.
export const IMAGE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 242 880 bytes
  MAX_FILES: 20,
  SUPPORTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  SUPPORTED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
};

// Resolve a backend-relative image URL to a usable absolute URL.
// Backend stores /uploads/<filename>; static middleware serves from API_BASE.
export const resolveImageURL = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  // Relative path like "/uploads/abc.jpg" → prepend API_BASE origin.
  if (url.startsWith('/uploads/')) return `${API_BASE.replace(/\/+$/, '')}${url}`;
  if (url.startsWith('/')) return `${API_BASE.replace(/\/+$/, '')}${url}`;
  return url;
};

// Helper: format file size in human-readable form.
export const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(exponent <= 1 ? 0 : 1)} ${units[exponent]}`;
};

export const initialsFor = (name) => {
  const text = String(name || 'C').trim();
  const parts = text.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return parts || 'C';
};
