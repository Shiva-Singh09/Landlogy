import React from 'react';
import { Bell, Building2, FileText, MessageCircle, UserRound } from 'lucide-react';

const ICONS = {
  properties: Building2,
  documents: FileText,
  notifications: Bell,
  profile: UserRound,
  support: MessageCircle
};

export function EmptyState({ title, description, icon = 'properties', action }) {
  const Icon = ICONS[icon] || Building2;

  return (
    <div className="lp-card">
      <div className="lp-empty">
        <span className="lp-empty-i"><Icon size={28} /></span>
        <h3>{title}</h3>
        <p>{description}</p>
        {action && <div className="lp-empty-a">{action}</div>}
      </div>
    </div>
  );
}

export default EmptyState;