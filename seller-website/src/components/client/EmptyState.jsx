import React from 'react';
import { Bell, FileText, FolderOpen, MessageCircle, UserRound } from 'lucide-react';

const icons = {
  properties: FolderOpen,
  documents: FileText,
  notifications: Bell,
  profile: UserRound,
  support: MessageCircle
};

export function EmptyState({ title, description, icon = 'properties', action }) {
  const Icon = icons[icon] || FolderOpen;

  return (
    <div className="portal-section-wrapper">
      <div className="portal-mini-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '18px', background: '#f5efe3', color: '#b98022', marginBottom: '18px' }}>
          <Icon size={26} />
        </div>
        <h3 style={{ margin: '0 0 8px', color: '#192536', fontSize: '28px', fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: '0 auto 18px', maxWidth: '520px', color: '#5e6c7b', lineHeight: 1.7 }}>{description}</p>
        {action}
      </div>
    </div>
  );
}
