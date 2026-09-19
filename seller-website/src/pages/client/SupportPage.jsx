import React from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SUPPORT_CONTACT } from '../../config/constants';

const WA = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent('Hi LANDLOGY, I need help with my property.')}`;

const FAQ = [
  ['How long does a review take?', 'Most properties are reviewed within two to three working days of being submitted. You will see the stage change here, and we will call you.'],
  ['Can I change my property details?', 'Yes. Call or message us with your property reference and what needs changing, and we will update it.'],
  ['What documents will you need?', 'Usually the title deed, latest tax receipt and identity proof. We will tell you exactly what applies to your property after the first review.'],
  ['When will I hear about buyers?', 'Once a property is approved it goes to relevant buyers. Your point of contact will call you as enquiries come in.']
];

export function SupportPage() {
  return (
    <>
      <header className="lp-head">
        <span className="lp-k">Support</span>
        <h1>How can we <em>help?</em></h1>
        <p>Call, email or message us. Keep your property reference handy so we can pull up your file quickly.</p>
      </header>

      <div className="lp-grid">
        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Common questions</span>
              <h2>Before you call</h2>
            </div>
          </div>
          <div className="lp-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Reach us</span>
              <h2>Talk to the team</h2>
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

          <div className="lp-hours">
            <div><Clock size={15} /><span><small>Hours</small><b>Mon–Sat, 9:00 AM – 7:00 PM<br />Sunday, 10:00 AM – 4:00 PM</b></span></div>
            <div><MapPin size={15} /><span><small>Office</small><b>Halwasia, Hazratganj,<br />Lucknow, Uttar Pradesh 226001</b></span></div>
          </div>
        </section>
      </div>
    </>
  );
}

export default SupportPage;