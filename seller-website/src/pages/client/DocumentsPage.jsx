import React from 'react';
import { FileText, Phone, ShieldCheck } from 'lucide-react';
import { SUPPORT_CONTACT } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const EXPECTED = [
  ['Title deed', 'Proof that the property is registered in your name.'],
  ['Latest tax receipt', 'The most recent property tax payment receipt.'],
  ['Identity proof', 'Aadhaar or PAN of the registered owner.'],
  ['Encumbrance certificate', 'Confirms the property carries no outstanding dues.']
];

export function DocumentsPage({ properties = [] }) {
  const hasProperty = Array.isArray(properties) && properties.length > 0;

  return (
    <>
      <header className="lp-head">
        <span className="lp-k">Paperwork</span>
        <h1>Your <em>documents</em></h1>
        <p>Documents for your properties are filed by our team and will appear here as they are verified.</p>
      </header>

      <div className="lp-grid">
        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Filed so far</span>
              <h2>Nothing filed yet</h2>
            </div>
          </div>

          <div className="lp-empty">
            <span className="lp-empty-i"><FileText size={28} /></span>
            <h3>No documents on file</h3>
            <p>
              {hasProperty
                ? 'Once our team verifies the paperwork for your property, each document will be listed here with its status.'
                : 'Add a property first. We will then tell you exactly which documents are needed and file them here.'}
            </p>
            <div className="lp-empty-a">
              {hasProperty
                ? <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`} className="lp-btn lp-btn-a"><Phone size={15} /> Ask about my documents</a>
                : <SpaLink to="/client-portal/add-property" className="lp-btn lp-btn-a">Add a property</SpaLink>}
            </div>
          </div>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Usually needed</span>
              <h2>What to keep ready</h2>
              <p>The documents most property sales require.</p>
            </div>
          </div>

          <div className="lp-checklist">
            {EXPECTED.map(([title, note]) => (
              <div key={title}>
                <span className="lp-check-i"><FileText size={15} /></span>
                <span><b>{title}</b><small>{note}</small></span>
              </div>
            ))}
          </div>

          <p className="lp-quiet">
            <ShieldCheck size={14} /> Exactly which documents apply depends on the property. Our team will confirm the list with you after the first review.
          </p>
        </section>
      </div>
    </>
  );
}

export default DocumentsPage;