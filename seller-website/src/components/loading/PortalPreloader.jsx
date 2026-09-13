import React, { useEffect, useState } from 'react';
import logo from '../../assets/Logo.png';

export function PortalPreloader({ active = true }) {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => setVisible(false), 220);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="portal-preloader" aria-live="polite" aria-busy="true">
      <div className="portal-preloader-card">
        <img src={logo} alt="LANDLOGY" />
        <span>Preparing your workspace…</span>
        <div className="portal-preloader-bar"><span /></div>
      </div>
    </div>
  );
}
