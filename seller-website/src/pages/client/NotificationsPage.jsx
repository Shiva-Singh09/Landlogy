import React from 'react';
import { Bell, Mail, MessageCircle, Phone } from 'lucide-react';
import { SUPPORT_CONTACT } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const WA = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent('Hi LANDLOGY, I have a question about my property.')}`;

export function NotificationsPage() {
  return (
    <>
      <header className="lp-head">
        <span className="lp-k">Updates</span>
        <h1>Your <em>notifications</em></h1>
        <p>Updates about your properties will appear here.</p>
      </header>

      <div className="lp-grid">
        <section className="lp-card">
          <div className="lp-empty">
            <span className="lp-empty-i"><Bell size={28} /></span>
            <h3>You are all caught up</h3>
            <p>There is nothing new right now. When your property moves to a new stage or our team has news, you will see it here.</p>
            <div className="lp-empty-a">
              <SpaLink to="/client-portal/status" className="lp-btn lp-btn-b">Check property status</SpaLink>
            </div>
          </div>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Meanwhile</span>
              <h2>We will also call you</h2>
              <p>Anything important comes by phone, not just here.</p>
            </div>
          </div>

          <div className="lp-contact">
            <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`}>
              <span className="lp-contact-i"><Phone size={16} /></span>
              <span><small>Call us</small><strong>{SUPPORT_CONTACT.phone}</strong></span>
            </a>
            <a href={`mailto:${SUPPORT_CONTACT.email}`}>
              <span className="lp-contact-i"><Mail size={16} /></span>
              <span><small>Email</small><strong>{SUPPORT_CONTACT.email}</strong></span>
            </a>
          </div>

          <a href={WA} target="_blank" rel="noreferrer" className="lp-wa">
            <MessageCircle size={16} /> WhatsApp us
          </a>
        </section>
      </div>
    </>
  );
}

export default NotificationsPage;