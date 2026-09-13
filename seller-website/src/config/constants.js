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

export const initialsFor = (name) => {
  const text = String(name || 'C').trim();
  const parts = text.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return parts || 'C';
};
