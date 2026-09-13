import React from 'react';
import { Check, Clock3 } from 'lucide-react';
import { formatDate, statusLabel } from '../../config/constants';

export function StatusTimeline({ history = [], currentStatus }) {
  const entries = Array.isArray(history) && history.length > 0 ? [...history] : [];

  const normalized = entries.map((entry, index) => ({
    key: entry.id || `${entry.status || 'status'}-${index}`,
    label: statusLabel(entry.to || entry.status || currentStatus),
    date: formatDate(entry.at || entry.created_at || entry.updated_at),
    note: entry.note || entry.comment || entry.summary || entry.details || 'Status updated by LANDLOGY.'
  }));

  if (currentStatus && !normalized.some((entry) => (entry.label || '').toLowerCase() === statusLabel(currentStatus).toLowerCase())) {
    normalized.push({
      key: `current-${currentStatus}`,
      label: statusLabel(currentStatus),
      date: 'Current',
      note: 'Current property status.'
    });
  }

  if (!normalized.length) {
    return (
      <div className="portal-mini-card">
        <h3 style={{ margin: '0 0 12px', color: '#192536' }}>Status history</h3>
        <p style={{ margin: 0, color: '#5e6c7b' }}>No status updates have been recorded yet for this property.</p>
      </div>
    );
  }

  return (
    <div className="portal-section-wrapper">
      <div className="portal-mini-card">
        <h3 style={{ margin: '0 0 18px', color: '#192536' }}>Status timeline</h3>
        <div className="timeline">
          {normalized.map((item, index) => {
            const isCurrent = index === normalized.length - 1;
            return (
              <div key={item.key} className={`timeline-item ${isCurrent ? 'current' : 'complete'}`}>
                <div className="timeline-marker">{isCurrent ? <Clock3 size={14} /> : <Check size={14} />}</div>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.date}</span>
                  <p>{item.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
