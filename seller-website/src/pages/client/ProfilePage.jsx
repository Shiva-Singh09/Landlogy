import React, { useState } from 'react';
import {
  AlertCircle, AtSign, BadgeCheck, Building2, Check, Clock, IdCard,KeyRound ,Mail, MapPin,
  MessageCircle, Phone, Shield, ShieldCheck, Smartphone, UserRound
} from 'lucide-react';
import { InlineSpinner } from '../../components/loading/InlineSpinner';
import { ProfileSkeleton } from '../../components/loading/PortalSkeletons';
import { refOf } from '../../components/client/PropertyCard';
import { CLIENT_STORE, CLIENT_TOKEN_KEY, requestPasswordResetApi, verifyPasswordResetApi } from '../../api/clientApi';
import {
  formatDate, formatPriceINR, initialsFor, statusLabel, SUPPORT_CONTACT
} from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const WA = (msg) => `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

const FAQ = [
  ['How long does a review take?',
   'Most properties are reviewed within two to three working days. The stage updates here, and we call you.'],
  ['Can I change my property details?',
   'Yes. Call or message us with the property reference and what needs changing — we update it for you.'],
  ['What documents will you need?',
   'Usually the title deed, latest tax receipt and identity proof. We confirm exactly what applies after the first review.'],
  ['When will I hear about buyers?',
   'Once a property is approved we bring it to relevant buyers. Your point of contact calls you as enquiries come in.'],
  ['How do I change my email or mobile?',
   'Message us and we will update it. We handle this for you so your ownership records stay accurate.']
];

export function ProfilePage({ user, properties = [], loading = false }) {
  const [copied, setCopied] = useState('');
  // ── Account Security: single self-service password RESET flow (Task 6).
  //       1. "Reset my password" opens the new-password fields
  //       2. "Change password" → POST /api/client/password-reset/request
  //       3. on success → OTP field
  //       4. "Verify" → POST /api/client/password-reset/verify
  //       5. on success → "Password changed successfully."
  // No forced-change step and no recovery placeholder; the request endpoint issues the OTP.
  // Token comes from the existing client-auth store — the recipient is derived
  // server-side from the JWT; user_id/email are never sent from the client.
  // Passwords/OTP are kept only in component state and cleared after success.
  const [rpStage, setRpStage] = useState('idle'); // 'idle' | 'entry' | 'pending' | 'verified'
  const [rp, setRp] = useState({ next: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [rpBusy, setRpBusy] = useState(false);
  const [rpError, setRpError] = useState('');
  const [rpOk, setRpOk] = useState('');
  if (loading || !user) return <ProfileSkeleton />;

  const name = user.name || 'Client';
  const list = Array.isArray(properties) ? properties : [];
  const accountRef = refOf(user.id);

  const fields = [
    { label: 'Full name', value: name, icon: UserRound, cap: true },
    { label: 'Email address', value: user.email, icon: AtSign },
    { label: 'Mobile number', value: user.phone, icon: Smartphone },
    { label: 'Account type', value: 'Property owner', icon: Shield },
    { label: 'Account status', value: user.status || 'Active', icon: BadgeCheck, cap: true },
    { label: 'Account reference', value: accountRef || '—', icon: IdCard }
  ];

  const copy = (label, text) => {
    if (!text || text === '—') return;
    try {
      navigator.clipboard?.writeText(String(text));
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } catch {}
  };

  // ── Account Security password RESET flow (Task 6) ──────────────────────────
  // The previous change form was removed; this card now runs two handlers only:
  // 1) startReset — validates the two new-password fields, then POSTs the
  //    request endpoint to generate + dispatch an OTP (recipient = req.user).
  // 2) submitVerify — confirms the OTP and applies the new password.
  const resetPasswordValidation = () => {
    if (!rp.next || !rp.confirm) return 'Please fill in both password fields.';
    if (rp.next.length < 8) return 'Your new password must be at least 8 characters long.';
    if (rp.next.length > 128) return 'Your new password must be shorter than 128 characters.';
    if (rp.next !== rp.confirm) return 'The new passwords do not match. Please re-enter them.';
    return '';
  };

  const startReset = async (event) => {
    event.preventDefault();
    setRpError('');
    setRpOk('');

    const validationError = resetPasswordValidation();
    if (validationError) {
      setRpError(validationError);
      return;
    }

    setRpBusy(true);
    try {
            await requestPasswordResetApi(CLIENT_STORE.get(CLIENT_TOKEN_KEY));
      // Only on success do we reveal the OTP field (no fake success).
      setRpStage('pending');
      setRpError('');
    } catch (err) {
      if (err && err.code === 'NETWORK') {
        setRpError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else if (err && (err.status === 401 || err.status === 403)) {
        setRpError('Your session is no longer valid. Please log in again.');
      } else if (err && err.message) {
        // Server-owned, user-actionable wording.
        setRpError(err.message);
      } else {
        setRpError('Unable to start password reset right now. Please try again.');
      }
    } finally {
      setRpBusy(false);
    }
  };

  const submitVerify = async (event) => {
    event.preventDefault();
    setRpError('');
    setRpOk('');

    if (!otp) {
      setRpError('Please enter the verification code sent to you.');
      return;
    }

    setRpBusy(true);
    try {
      await verifyPasswordResetApi(otp, rp.next, CLIENT_STORE.get(CLIENT_TOKEN_KEY));
      // Success — surface confirmation and clear all sensitive state.
      setRpStage('verified');
      setOtp('');
      setRp({ next: '', confirm: '' });
      setRpOk('Password changed successfully.');
    } catch (err) {
      if (err && err.code === 'NETWORK') {
        setRpError('Unable to reach LANDLOGY services. Please check your connection and try again.');
      } else if (err && (err.status === 401 || err.status === 403)) {
        setRpError('Your session is no longer valid. Please log in again.');
      } else if (err && err.message) {
        setRpError(err.message);
      } else {
        setRpError('Unable to verify your code right now. Please try again.');
      }
    } finally {
      setRpBusy(false);
    }
  };

  return (
    <>
      <header className="lp-head">
        <span className="lp-k">Account</span>
        <h1>Profile &amp; <em>support</em></h1>
        <p>Your details, your properties, and how to reach the team.</p>
      </header>

      {/* identity band */}
      <section className="lp-idband">
        <span className="lp-idband-av">
          {initialsFor(name)}
          <i><BadgeCheck size={15} /></i>
        </span>
        <div className="lp-idband-b">
          <h2>{name}</h2>
          <div className="lp-idband-meta">
            <span className="lp-pill s-active"><i /> Verified account</span>
            {list.length > 0 && (
              <span><Building2 size={13} /> {list.length} propert{list.length === 1 ? 'y' : 'ies'}</span>
            )}
            {list[0]?.city && <span><MapPin size={13} /> {list[0].city}</span>}
          </div>
        </div>
        <a href={WA('Hi LANDLOGY, I would like to update my account details.')} target="_blank"
          rel="noreferrer" className="lp-btn lp-btn-a lp-idband-cta">
          <MessageCircle size={15} /> Request a change
        </a>
      </section>

      <div className="lp-grid" style={{ marginTop: 'var(--s4)' }}>
        <div>
          {/* details */}
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Your details</span>
                <h2>Personal &amp; contact information</h2>
                <p>Recorded when your account was created. Tap any field to copy it.</p>
              </div>
              <span className="lp-lock"><Shield size={14} /> Read only</span>
            </div>

            <div className="lp-fcards">
              {fields.map(({ label, value, icon: Icon, cap }) => (
                <button type="button" className="lp-fcard" key={label}
                  onClick={() => copy(label, value)} title={`Copy ${label.toLowerCase()}`}>
                  <small>{label}</small>
                  <b className={cap ? 'cap' : ''}>{value || '—'}</b>
                  <span className="lp-fcard-i">
                    {copied === label ? <Check size={15} className="ok" /> : <Icon size={15} />}
                  </span>
                </button>
              ))}
            </div>

            <p className="lp-quiet">
              <ShieldCheck size={14} /> To change your name, email or mobile, message the team. We update these for you so your ownership records stay accurate.
            </p>
          </section>

          {/* properties */}
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Linked to this account</span>
                <h2>Your properties</h2>
                <p>{list.length === 0 ? 'Nothing linked yet.' : `${list.length} propert${list.length === 1 ? 'y' : 'ies'} with LANDLOGY.`}</p>
              </div>
              {list.length > 0 && <SpaLink to="/client-portal/properties" className="lp-link">View all</SpaLink>}
            </div>

            {list.length === 0 ? (
              <div className="lp-empty" style={{ padding: 'var(--s5) var(--s3)' }}>
                <span className="lp-empty-i"><Building2 size={26} /></span>
                <h3>No properties linked</h3>
                <p>Add a property and it will appear against your account here.</p>
                <div className="lp-empty-a">
                  <SpaLink to="/client-portal/add-property" className="lp-btn lp-btn-a">Add a property</SpaLink>
                </div>
              </div>
            ) : (
              <div className="lp-linked">
                {list.slice(0, 5).map((p) => (
                  <SpaLink key={p.id} to={`/client-portal/properties/${encodeURIComponent(p.id)}`} className="lp-linked-row">
                    <span className="lp-linked-i"><Building2 size={17} /></span>
                    <span className="lp-linked-m">
                      <strong>{p.title || 'Property'}</strong>
                      <small>{[p.city, p.state].filter(Boolean).join(', ') || 'Location to be confirmed'}</small>
                      <span className={`lp-pill s-${p.status || 'draft'}`}><i />{statusLabel(p.status)}</span>
                    </span>
                    <span className="lp-linked-p">
                      <small>Asking price</small>
                      <b>{formatPriceINR(p.asking_price ?? p.price)}</b>
                    </span>
                  </SpaLink>
                ))}
              </div>
            )}
          </section>

          {/* faq */}
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
        </div>

        {/* right rail */}
        <div>
          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Direct channel</span>
                <h2>Your advisory desk</h2>
                <p>The team handling your properties.</p>
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

            <a href={WA('Hi LANDLOGY, I need help with my property.')} target="_blank" rel="noreferrer" className="lp-wa">
              <MessageCircle size={16} /> WhatsApp us
            </a>

            <div className="lp-hours">
              <div>
                <Clock size={15} />
                <span><small>Hours</small><b>Mon–Sat, 9:00 AM – 7:00 PM<br />Sunday, 10:00 AM – 4:00 PM</b></span>
              </div>
              <div>
                <MapPin size={15} />
                <span><small>Office</small><b>Halwasia, Hazratganj,<br />Lucknow 226001</b></span>
              </div>
            </div>
          </section>

          <section className="lp-card">
            <div className="lp-card-head">
              <div>
                <span className="lp-k">Account security</span>
                <h2>Keeping it safe</h2>
              </div>
            </div>

                <div className="lp-secure-rows">
              <div><span>Password</span><b>Set by you</b></div>
              <div><span>Last changed</span><b>—</b></div>
              <div><span>Account status</span><b className="ok">{user.status || 'Active'}</b></div>
              <div><span>Reference</span><b>{accountRef || '—'}</b></div>
            </div>

            {/* Password RESET (Task 6) — the ONLY password flow on this card.
                No forced-change form, no redirect, no placeholder notice. */}
            {rpStage === 'verified' ? (
              <p className="lp-ok" role="status" style={{ marginTop: 'var(--s4)' }}>
                <Check size={16} /> {rpOk}
              </p>
            ) : rpStage === 'idle' ? (
              <button type="button" className="lp-btn lp-btn-a" style={{ width: '100%' }}
                onClick={() => { setRpStage('entry'); setRpError(''); setRpOk(''); }}>
                <KeyRound size={15} /> Reset my password
              </button>
            ) : (
              <form
                onSubmit={rpStage === 'pending' ? submitVerify : startReset}
                noValidate
                style={{ marginTop: 'var(--s4)' }}
              >
                <span className="lp-k">Reset my password</span>
                <p style={{ margin: '4px 0 var(--s3)', fontSize: 'var(--t-small)', color: 'var(--tx-500)' }}>
                  Enter a new password and the code we send to verify your identity.
                </p>

                {rpStage === 'pending' ? (
                  <div className="lp-field">
                    <label htmlFor="rp-otp">Verification code</label>
                    <input id="rp-otp" name="rp-otp" type="text" inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter the code sent to you" disabled={rpBusy} required />
                  </div>
                ) : (
                  <>
                    <div className="lp-field">
                      <label htmlFor="rp-new">New password <em>8–128 characters</em></label>
                      <input id="rp-new" name="rp-new" type="password" autoComplete="new-password"
                        value={rp.next} onChange={(e) => setRp((p) => ({ ...p, next: e.target.value }))}
                        placeholder="At least 8 characters" disabled={rpBusy} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="rp-confirm">Confirm new password</label>
                      <input id="rp-confirm" name="rp-confirm" type="password" autoComplete="new-password"
                        value={rp.confirm} onChange={(e) => setRp((p) => ({ ...p, confirm: e.target.value }))}
                        placeholder="Type it once more" disabled={rpBusy} required />
                    </div>
                  </>
                )}

                {rpError && (
                  <div className="lp-err" role="alert" style={{ marginBottom: 'var(--s3)' }}>
                    <AlertCircle size={16} />
                    <div><strong>Couldn&apos;t continue</strong><p>{rpError}</p></div>
                  </div>
                )}

                <button type="submit" className="lp-btn lp-btn-a" style={{ width: '100%' }} disabled={rpBusy}>
                  {rpBusy
                    ? <InlineSpinner label={rpStage === 'pending' ? 'Verifying…' : 'Resetting…'} />
                    : (<><KeyRound size={15} />{rpStage === 'pending' ? 'Verify' : 'Change password'}</>)}
                </button>
              </form>
            )}

            <p className="lp-quiet">
              <ShieldCheck size={14} /> LANDLOGY will never ask for your password over a call or message. If someone does, hang up and tell us.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;