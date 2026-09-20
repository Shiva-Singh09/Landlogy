import React from 'react';
import { Loader2 } from 'lucide-react';

// Shared inline spinner — small, theme-native, preserves control dimensions.
// Use INSIDE buttons/controls for short user-triggered actions only.
export function InlineSpinner({ size = 15, label, className = '' }) {
  if (label) {
    return (
      <span className={`lp-inline-spinner ${className}`} role="status" aria-live="polite">
        <Loader2 size={size} className="lp-spin" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }
  return <Loader2 size={size} className={`lp-spin ${className}`} aria-hidden="true" />;
}

export default InlineSpinner;