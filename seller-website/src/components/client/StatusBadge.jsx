import React from 'react';
import { statusLabel } from '../../config/constants';

export function StatusBadge({ status, className = '' }) {
  const value = statusLabel(status);
  const tone = status === 'sold' ? 'success' : status === 'rejected' || status === 'inactive' ? 'warning' : 'default';

  return (
    <span className={`status-pill ${tone} ${className}`.trim()}>{value}</span>
  );
}
