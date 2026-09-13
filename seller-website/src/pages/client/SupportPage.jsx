import React from 'react';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { SUPPORT_CONTACT } from '../../config/constants';

export function SupportPage() {
  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Need help?</h1>
          <p>Use the verified contact options below for secure account and property support.</p>
        </div>
      </div>

      <section className="portal-section" style={{ display: 'grid', gap: '18px' }}>
        <div className="portal-mini-card">
          <div className="profile-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${SUPPORT_CONTACT.email}`} style={{ color: '#192536' }}>{SUPPORT_CONTACT.email}</a></dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd><a href={`tel:${SUPPORT_CONTACT.phoneRaw}`} style={{ color: '#192536' }}>{SUPPORT_CONTACT.phone}</a></dd>
            </div>
          </div>
        </div>

        <div className="portal-mini-card">
          <h3 style={{ margin: '0 0 12px', color: '#192536' }}>Useful guidance</h3>
          <p style={{ margin: '0 0 14px', color: '#48596b', lineHeight: 1.8 }}>For account access, property questions, or portal concerns, contact the support team using the options above. Please include the property reference or account email when possible to help us respond quickly.</p>
          <a href={`https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace('+', '')}?text=${encodeURIComponent('Hi LANDLOGY, I need help with my property.')}`} target="_blank" rel="noreferrer" className="btn btn-primary"><MessageCircle size={14} /> WhatsApp support</a>
        </div>
      </section>
    </>
  );
}
