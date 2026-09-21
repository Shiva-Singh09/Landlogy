import React, { useCallback, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Building2, Check, Images,
  MapPin, Plus, Wallet
} from 'lucide-react';
import { createClientProperty, uploadClientPropertyImage } from '../../api/clientApi';
import { InlineSpinner } from '../../components/loading/InlineSpinner';
import { formatPriceINR, SUPPORT_CONTACT } from '../../config/constants';
import { PropertyImageSelector } from '../../components/client/PropertyImageSelector';
import { refOf } from '../../components/client/PropertyCard';

const TYPES = ['Villa', 'Apartment', 'Plot', 'House', 'Commercial', 'Farmhouse', 'Other'];
const CATEGORIES = ['Residential', 'Commercial', 'Agricultural', 'Industrial'];

const EMPTY = {
  title: '', description: '', property_type: '', property_category: '',
  address: '', city: '', state: '', pincode: '', latitude: '', longitude: '', asking_price: ''
};

const STEPS = [
  { n: 1, label: 'The basics', icon: Building2, fields: ['title', 'property_type', 'property_category'] },
  { n: 2, label: 'Location', icon: MapPin, fields: ['address', 'city', 'state', 'pincode'] },
  { n: 3, label: 'Price', icon: Wallet, fields: ['asking_price'] },
  { n: 4, label: 'Photos', icon: Images, fields: [] }
];

function validate(f, only) {
  const e = {};
  if (!f.title.trim()) e.title = 'Give your property a short name';
  if (!f.property_type) e.property_type = 'Choose a type';
  if (!f.property_category) e.property_category = 'Choose a category';
  if (!f.address.trim()) e.address = 'Address is needed';
  if (!f.city.trim()) e.city = 'City is needed';
  if (!f.state.trim()) e.state = 'State is needed';
  if (!/^\d{6}$/.test(f.pincode.trim())) e.pincode = 'Enter a 6-digit pincode';
  if (!f.asking_price || Number(f.asking_price) <= 0) e.asking_price = 'Enter the price you have in mind';
  if (f.latitude && (Number(f.latitude) < -90 || Number(f.latitude) > 90)) e.latitude = 'Must be between -90 and 90';
  if (f.longitude && (Number(f.longitude) < -180 || Number(f.longitude) > 180)) e.longitude = 'Must be between -180 and 180';
  if (!only) return e;
  return Object.fromEntries(Object.entries(e).filter(([k]) => only.includes(k)));
}

export function AddPropertyPage({ token, onBack, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('form');
  const [submitError, setSubmitError] = useState('');
  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [created, setCreated] = useState(null);
  const [uploaded, setUploaded] = useState(0);
  const [failed, setFailed] = useState(0);

  const busy = phase === 'saving' || phase === 'uploading';
  const onSelect = useCallback((next) => setImages(next), []);

  const change = (field) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [field]: v }));
    setErrors((p) => { if (!(field in p)) return p; const q = { ...p }; delete q[field]; return q; });
  };

  /* which steps are complete — drives the rail */
  const stepDone = (s) => s.fields.length > 0 && Object.keys(validate(form, s.fields)).length === 0;

  const uploadAll = async (id, list) => {
    setPhase('uploading');
    setProgress({ done: 0, total: list.length });
    let ok = 0, bad = 0;
    for (const entry of list) {
      try {
        const res = await uploadClientPropertyImage(id, entry.file, token, { isPrimary: entry.isPrimary });
        if (res) ok += 1;
      } catch { bad += 1; }
      setProgress((p) => ({ done: p.done + 1, total: list.length }));
    }
    setUploaded(ok); setFailed(bad);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const v = validate(form);
    if (Object.keys(v).length) {
      setErrors(v);
      const first = document.querySelector(`[name="${Object.keys(v)[0]}"]`);
      first?.focus?.();
      first?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }

    setPhase('saving');
    setSubmitError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      property_type: form.property_type,
      property_category: form.property_category,
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      asking_price: Number(form.asking_price),
      ...(form.latitude ? { latitude: Number(form.latitude) } : {}),
      ...(form.longitude ? { longitude: Number(form.longitude) } : {})
    };

    let property = null;
    try {
      const res = await createClientProperty(payload, token);
      property = res?.property || res?.data || res;
      setCreated(property || null);
    } catch (err) {
      setSubmitError(err?.code === 'NETWORK'
        ? 'We could not reach LANDLOGY. Please check your connection and try again.'
        : (err?.message || 'We could not save this property. Please try again.'));
      setPhase('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!property?.id) {
      setSubmitError('The property was saved but we did not get a reference back. Please check My properties.');
      setPhase('form');
      return;
    }

    if (images.length > 0) await uploadAll(property.id, images);
    setPhase('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setForm(EMPTY); setErrors({}); setImages([]); setCreated(null);
    setUploaded(0); setFailed(0); setProgress({ done: 0, total: 0 });
    setSubmitError(''); setPhase('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── success ── */
  if (phase === 'done') {
    const ref = refOf(created?.id);
    return (
      <>
        <header className="lp-head">
          <span className="lp-k">Submitted</span>
          <h1>Property <em>received</em></h1>
        </header>

        <section className="lp-card">
          <div className="lp-done">
            <span className="lp-done-i"><Check size={32} /></span>
            <h2>{created?.title || form.title}</h2>
            <div className="lp-done-meta">
              {ref && <span className="lp-ref">REF {ref}</span>}
              <span className="lp-pill s-under_review"><i /> Under review</span>
            </div>
            <p>Asking price {formatPriceINR(created?.asking_price ?? form.asking_price)}</p>

            {uploaded > 0 && (
              <p className="lp-ok" style={{ justifyContent: 'center' }}>
                <Check size={15} /> {uploaded} photo{uploaded === 1 ? '' : 's'} uploaded
              </p>
            )}
            {failed > 0 && (
              <p className="lp-warnline">
                <AlertCircle size={15} /> {failed} photo{failed === 1 ? '' : 's'} did not upload — you can add them from the property page.
              </p>
            )}
          </div>

          <div className="lp-next">
            <span className="lp-k">What happens now</span>
            <ol>
              <li><b>We review the details</b><span>Usually within two to three working days.</span></li>
              <li><b>We call you</b><span>To confirm pricing and any documents we need.</span></li>
              <li><b>It goes live</b><span>Once approved, we bring it to relevant buyers.</span></li>
            </ol>
          </div>

          <div className="lp-empty-a" style={{ marginTop: 'var(--s5)' }}>
            <button type="button" className="lp-btn lp-btn-a" onClick={onSuccess}>
              View my properties <ArrowRight size={15} />
            </button>
            <button type="button" className="lp-btn lp-btn-b" onClick={reset}>
              <Plus size={15} /> Add another
            </button>
          </div>
        </section>
      </>
    );
  }

  /* ── form ── */
  return (
    <>
      <div className="lp-backrow">
        <button type="button" className="lp-link" onClick={onBack} disabled={busy}>
          <ArrowLeft size={14} /> My properties
        </button>
        <a href={`tel:${SUPPORT_CONTACT.phoneRaw}`} className="lp-quiet-link">
          Prefer to do this by phone? {SUPPORT_CONTACT.phone}
        </a>
      </div>

      <header className="lp-head">
        <span className="lp-k">New property</span>
        <h1>Tell us about your <em>property</em></h1>
        <p>Fill in what you know. We will confirm the rest with you after the first review.</p>
      </header>

      {/* step rail */}
      <div className="lp-rail">
        {STEPS.map((s) => (
          <div className={`lp-rail-i ${stepDone(s) ? 'done' : ''}`} key={s.n}>
            <span>{stepDone(s) ? <Check size={14} /> : <s.icon size={14} />}</span>
            <b>{s.label}</b>
          </div>
        ))}
      </div>

      <form onSubmit={submit} noValidate>
        {submitError && (
          <div className="lp-err" role="alert" style={{ marginBottom: 'var(--s4)' }}>
            <AlertCircle size={20} />
            <div><strong>Could not save</strong><p>{submitError}</p></div>
          </div>
        )}

        <section className="lp-card">
          <div className="lp-card-head">
            <div><span className="lp-k">Step 1</span><h2>The basics</h2></div>
          </div>

          <div className="lp-field">
            <label htmlFor="title">Property name</label>
            <input id="title" name="title" value={form.title} onChange={change('title')} disabled={busy}
              placeholder="e.g. 3 BHK flat in Gomti Nagar" className={errors.title ? 'bad' : ''} />
            {errors.title
              ? <span className="lp-bad">{errors.title}</span>
              : <span className="lp-help">A short name you would recognise on a phone call</span>}
          </div>

          <div className="lp-field-row">
            <div className="lp-field">
              <label htmlFor="property_type">Type</label>
              <select id="property_type" name="property_type" value={form.property_type}
                onChange={change('property_type')} disabled={busy} className={errors.property_type ? 'bad' : ''}>
                <option value="">Choose one</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.property_type && <span className="lp-bad">{errors.property_type}</span>}
            </div>
            <div className="lp-field">
              <label htmlFor="property_category">Category</label>
              <select id="property_category" name="property_category" value={form.property_category}
                onChange={change('property_category')} disabled={busy} className={errors.property_category ? 'bad' : ''}>
                <option value="">Choose one</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.property_category && <span className="lp-bad">{errors.property_category}</span>}
            </div>
          </div>

          <div className="lp-field">
            <label htmlFor="description">Description <em>optional</em></label>
            <textarea id="description" name="description" value={form.description} onChange={change('description')}
              disabled={busy} maxLength={2000}
              placeholder="Floor, facing, age, what is nearby — anything a buyer would ask about" />
            <span className="lp-help">{form.description.length}/2000</span>
          </div>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div><span className="lp-k">Step 2</span><h2>Where it is</h2></div>
          </div>

          <div className="lp-field">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" value={form.address} onChange={change('address')} disabled={busy}
              placeholder="Street, area, nearest landmark" className={errors.address ? 'bad' : ''} />
            {errors.address && <span className="lp-bad">{errors.address}</span>}
          </div>

          <div className="lp-field-row">
            <div className="lp-field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" value={form.city} onChange={change('city')} disabled={busy}
                placeholder="e.g. Lucknow" className={errors.city ? 'bad' : ''} />
              {errors.city && <span className="lp-bad">{errors.city}</span>}
            </div>
            <div className="lp-field">
              <label htmlFor="state">State</label>
              <input id="state" name="state" value={form.state} onChange={change('state')} disabled={busy}
                placeholder="e.g. Uttar Pradesh" className={errors.state ? 'bad' : ''} />
              {errors.state && <span className="lp-bad">{errors.state}</span>}
            </div>
          </div>

          <div className="lp-field" style={{ maxWidth: 240 }}>
            <label htmlFor="pincode">Pincode</label>
            <input id="pincode" name="pincode" inputMode="numeric" maxLength={6} value={form.pincode}
              onChange={change('pincode')} disabled={busy} placeholder="226010"
              className={errors.pincode ? 'bad' : ''} />
            {errors.pincode && <span className="lp-bad">{errors.pincode}</span>}
          </div>

          <details className="lp-more">
            <summary>Add map coordinates <em>optional</em></summary>
            <div className="lp-field-row" style={{ marginTop: 'var(--s3)' }}>
              <div className="lp-field">
                <label htmlFor="latitude">Latitude</label>
                <input id="latitude" name="latitude" type="number" step="any" value={form.latitude}
                  onChange={change('latitude')} disabled={busy} placeholder="26.8467"
                  className={errors.latitude ? 'bad' : ''} />
                {errors.latitude && <span className="lp-bad">{errors.latitude}</span>}
              </div>
              <div className="lp-field">
                <label htmlFor="longitude">Longitude</label>
                <input id="longitude" name="longitude" type="number" step="any" value={form.longitude}
                  onChange={change('longitude')} disabled={busy} placeholder="80.9462"
                  className={errors.longitude ? 'bad' : ''} />
                {errors.longitude && <span className="lp-bad">{errors.longitude}</span>}
              </div>
            </div>
          </details>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div><span className="lp-k">Step 3</span><h2>Your price</h2></div>
          </div>

          <div className="lp-field" style={{ maxWidth: 340 }}>
            <label htmlFor="asking_price">Asking price (₹)</label>
            <input id="asking_price" name="asking_price" type="number" min="0" step="1000"
              value={form.asking_price} onChange={change('asking_price')} disabled={busy}
              placeholder="8500000" className={errors.asking_price ? 'bad' : ''} />
            {errors.asking_price
              ? <span className="lp-bad">{errors.asking_price}</span>
              : form.asking_price > 0
                ? <span className="lp-pricechip">{formatPriceINR(form.asking_price)}</span>
                : <span className="lp-help">A starting figure is fine — we will discuss it with you</span>}
          </div>
        </section>

        <section className="lp-card">
          <div className="lp-card-head">
            <div>
              <span className="lp-k">Step 4</span>
              <h2>Photos</h2>
              <p>Optional, but listings with photos get taken far more seriously. You can add them later too.</p>
            </div>
            {images.length > 0 && <span className="lp-lock"><Images size={13} /> {images.length} selected</span>}
          </div>
          <PropertyImageSelector onSelectionChange={onSelect} disabled={busy} />
        </section>

        {phase === 'uploading' && (
          <div className="lp-progress" role="status" aria-live="polite">
            <div
              className="lp-progress-bar"
              role="progressbar"
              aria-label="Uploading photos"
              aria-valuemin={0}
              aria-valuemax={progress.total || 0}
              aria-valuenow={progress.done}
              aria-valuetext={`Uploading photo ${progress.done} of ${progress.total}`}
            >
              <span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
            <small>Uploading photo {progress.done} of {progress.total}</small>
          </div>
        )}

        <div className="lp-sticky">
          <span>
            {Object.keys(validate(form)).length === 0
              ? <><Check size={14} /> Ready to submit</>
              : 'Fill in the required details above'}
          </span>
          <div>
            <button type="button" className="lp-btn lp-btn-b" onClick={onBack} disabled={busy}>Cancel</button>
            <button type="submit" className="lp-btn lp-btn-a" disabled={busy}>
              {phase === 'saving' ? <InlineSpinner label="Saving…" />
                : phase === 'uploading' ? <InlineSpinner label={`Uploading ${progress.done} of ${progress.total}…`} />
                : <>Submit property <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export default AddPropertyPage;