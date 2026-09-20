import React from 'react';
import logo from '../../assets/Logo.png';

// Brand loader — ONLY for true blocking bootstrap (initial auth/session
// restoration) where the app cannot safely render yet. No timers, no minimum
// delay: the parent mounts this only while genuinely waiting, and unmounts it
// the moment bootstrap resolves. Indeterminate bar (not a fake percentage).
export function PortalPreloader({ active = true, label = 'Preparing your workspace…' }) {
  if (!active) return null;

  return (
    <div className="portal-preloader" role="status" aria-label="Loading your workspace">
      <div className="portal-preloader-card">
        <img src={logo} alt="LANDLOGY" />
        <span aria-live="polite">{label}</span>
        <div className="portal-preloader-bar" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
