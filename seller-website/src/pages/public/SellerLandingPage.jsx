import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, Building2, Check, ChevronRight, Clock, Mail, MapPin,
  MessageCircle, Menu, Phone, Scale, Search, ShieldCheck, Users, X
} from 'lucide-react';
import logo from '../../assets/Logo.png';
import heroVisual from '../../assets/Hero1.png';
import heroVisualAlt from '../../assets/Hero.png';
import { API_BASE } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

/* ───────── hooks ───────── */

function useReveal(enabled = true, rescan = '') {
  useEffect(() => {
    if (!enabled) return;
    const nodes = [...document.querySelectorAll('[data-reveal]')].filter((el) => !el.classList.contains('is-visible'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [enabled, rescan]);
}

function useMotionVars() {
  useEffect(() => {
    const root = document.documentElement;
    const fine = matchMedia('(pointer:fine)').matches;
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let frame = 0, mx = 0, my = 0;
    const apply = () => {
      frame = 0;
      root.style.setProperty('--mx', mx.toFixed(3));
      root.style.setProperty('--my', my.toFixed(3));
    };
    const onMove = (e) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onScroll = () => {
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : '0');
      document.body.classList.toggle('is-scrolled', y > 24);
    };
    if (fine && !still) addEventListener('mousemove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      removeEventListener('mousemove', onMove);
      removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

function useSiteData() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setError(null);
    fetch('/site-data.json')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(setSite)
      .catch(setError);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { site, error, load };
}

/* ───────── forms ───────── */

function Field({ label, name, select, options, textarea, type = 'text', placeholder, error, clearError, ...rest }) {
  const eid = `${name}-err`;
  const common = {
    id: name, name, placeholder,
    onChange: clearError ? () => clearError(name) : undefined,
    'aria-invalid': !!error, 'aria-describedby': error ? eid : undefined, ...rest
  };
  return (
    <div className={`field-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {select ? (
        <select defaultValue="" {...common}>
          <option value="">{placeholder || 'Select an option'}</option>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? <textarea {...common} /> : <input type={type} {...common} />}
      {error && <span id={eid} className="field-error" role="alert">{error}</span>}
    </div>
  );
}

const PHONE_RE = /^(?:\+91\s?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EnquiryForm({ intent }) {
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const clearError = (n) => setErrors((p) => { if (!(n in p)) return p; const q = { ...p }; delete q[n]; return q; });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus(''); setMsg(''); setErrors({});
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const err = {};
    const name = String(data.name || '').trim();
    if (!name) err.name = 'Please enter your name.';
    else if (name.length < 2 || name.length > 80) err.name = 'Name must be 2–80 characters.';
    if (!PHONE_RE.test(String(data.phone || '').replace(/\s+/g, ''))) err.phone = 'Enter a valid 10-digit mobile number.';
    if (data.email && !EMAIL_RE.test(String(data.email).trim())) err.email = 'Enter a valid email address.';
    if (!String(data.city || '').trim()) err.city = 'Please enter the city.';
    if (!String(data.property_type || '').trim()) err.property_type = 'Please select a property type.';
    if (String(data.message || '').length > 2000) err.message = 'Message is too long.';

    if (Object.keys(err).length) {
      setErrors(err); setBusy(false);
      ref.current?.querySelector(`[name="${Object.keys(err)[0]}"]`)?.focus?.();
      return;
    }

    data.intent = intent;
    data.formType = 'property-enquiry';

    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Submission failed');
      setStatus('success'); form.reset();
    } catch (error) { setStatus('error'); setMsg(error.message); }
    finally { setBusy(false); }
  };

  return (
    <form ref={ref} onSubmit={submit} noValidate>
      <div className="field-row">
        <Field label="Your name" name="name" placeholder="Full name" autoComplete="name" error={errors.name} clearError={clearError} />
        <Field label="Mobile" name="phone" placeholder="98765 43210" inputMode="tel" autoComplete="tel-national" error={errors.phone} clearError={clearError} />
      </div>
      <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} clearError={clearError} />
      <Field label="Property type" name="property_type" select
        options={['Residential apartment', 'Independent house / villa', 'Plot / land', 'Commercial space', 'Office space', 'Warehouse / industrial']}
        placeholder="Select property type" error={errors.property_type} clearError={clearError} />
      <Field label="City or location" name="city" placeholder="Where is the property?" autoComplete="address-level2" error={errors.city} clearError={clearError} />
      <Field label="Anything else (optional)" name="message" textarea placeholder="Tell us about the property or what you need." error={errors.message} clearError={clearError} />
      {status === 'success' && <div className="form-status success" role="status"><Check size={15} /> Enquiry received. We will be in touch within a working day.</div>}
      {status === 'error' && <div className="form-status error" role="alert"><X size={15} /> {msg}</div>}
      <button type="submit" className="ll-btn ll-btn-a ll-btn-wide" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  );
}

const RATINGS = ['Very helpful', 'Somewhat helpful', 'Needs work'];

function FeedbackForm() {
  const [rating, setRating] = useState(RATINGS[0]);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const clearError = (n) => setErrors((p) => { if (!(n in p)) return p; const q = { ...p }; delete q[n]; return q; });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus(''); setErrors({});
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const err = {};
    if (!String(data.name || '').trim()) err.name = 'Please enter your name.';
    if (!PHONE_RE.test(String(data.phone || '').replace(/\s+/g, ''))) err.phone = 'Enter a valid 10-digit mobile number.';
    if (data.email && !EMAIL_RE.test(String(data.email).trim())) err.email = 'Enter a valid email address.';
    if (String(data.message || '').trim().length < 10) err.message = 'Please write at least 10 characters.';
    if (Object.keys(err).length) { setErrors(err); setBusy(false); return; }

    data.rating = rating;
    data.intent = 'Website feedback';
    data.formType = 'feedback';

    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      setStatus('success'); form.reset(); setRating(RATINGS[0]);
    } catch { setStatus('error'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="ll-rate">
        {RATINGS.map((r) => (
          <label key={r} className={rating === r ? 'on' : ''}>
            <input type="radio" name="ratingChoice" checked={rating === r} onChange={() => setRating(r)} />
            {r}
          </label>
        ))}
      </div>
      <div className="field-row">
        <Field label="Your name" name="name" placeholder="Full name" autoComplete="name" error={errors.name} clearError={clearError} />
        <Field label="Mobile" name="phone" placeholder="98765 43210" inputMode="tel" autoComplete="tel-national" error={errors.phone} clearError={clearError} />
      </div>
      <Field label="Email (optional)" name="email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} clearError={clearError} />
      <Field label="What could be better?" name="message" textarea placeholder="Tell us what worked and what didn't." error={errors.message} clearError={clearError} />
      {status === 'success' && <div className="form-status success" role="status"><Check size={15} /> Thank you — noted.</div>}
      {status === 'error' && <div className="form-status error" role="alert"><X size={15} /> Something went wrong. Please try again.</div>}
      <button type="submit" className="ll-btn ll-btn-b ll-btn-wide" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
    </form>
  );
}

/* ───────── page ───────── */

const NAV = [
  ['#services', 'What we do'],
  ['#land', 'Land & visualisation'],
  ['#network', 'Who we serve'],
  ['#process', 'How it works'],
  ['#team', 'Our team'],
  ['#contact', 'Contact']
];

const TABS = [
  ['sell', 'Sell', 'Tell us what you own and where it is. We come back with a realistic view of price and next steps.'],
  ['value', 'Valuation', 'Get a research-backed price range before you decide whether to list.'],
  ['advice', 'Advice', 'Not ready to sell yet? Ask us about timing, documents or market conditions.']
];

const CLUSTERS = [
  {
    n: '01', code: 'Pricing',
    title: 'Getting it priced right',
    text: 'Before anything is promoted, we work out what the property is genuinely worth and how it should be positioned.',
    names: ['Property Assessment', 'Pricing & Positioning', 'Professional Presentation'],
    foot: 'Research before recommendation'
  },
  {
    n: '02', code: 'Verification',
    title: 'Getting it verified',
    text: 'Ownership, documents and location context are organised early, so nothing surfaces late in a negotiation.',
    names: ['Verification Support', 'Land Aggregation', 'Property Intelligence & Presentation'],
    foot: 'Checked before promotion'
  },
  {
    n: '03', code: 'Closing',
    title: 'Getting it sold',
    text: 'The property reaches buyers whose requirements actually match it, and you have support through to handover.',
    names: ['Relevant Buyer Reach', 'Negotiation & Closing Support', '3D Property Visualization'],
    foot: 'Guidance through the sale'
  }
];

const CORRIDORS = ['Lucknow', 'Delhi NCR', 'Mumbai', 'Bangalore'];

export function SellerLandingPage() {
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState('sell');
  const { site, error, load } = useSiteData();

  useReveal(!!site);
  useMotionVars();

  useEffect(() => {
    document.body.classList.toggle('menu-open', menu);
    return () => document.body.classList.remove('menu-open');
  }, [menu]);

  if (!site) {
    return (
      <div className="ll-boot">
        {error ? (
          <>
            <strong>LANDLOGY is temporarily unavailable.</strong>
            <button className="ll-btn ll-btn-a" onClick={load}>Try again</button>
          </>
        ) : 'Loading…'}
      </div>
    );
  }

  const active = TABS.find((t) => t[0] === tab);
  const svc = (name) => site.sellerServices.find((s) => s[1] === name);
  const closeMenu = () => setMenu(false);

  return (
    <main className="ll">
      {/* nav */}
      <nav className="ll-nav">
        <div className="ll-wrap ll-nav-in">
          <a className="ll-logo" href="#top" aria-label="LANDLOGY home">
            <img src={logo} alt="" />
            <span><strong>LANDLOGY</strong><small>Property selling support</small></span>
          </a>
          <div className="ll-links">
            {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </div>
          <div className="ll-nav-cta">
            <a className="ll-quiet" href={`tel:${site.contact.phoneRaw}`}><Phone size={13} /> Call us</a>
            <SpaLink className="ll-quiet" to="/client-login">Client login</SpaLink>
            <a href="#enquire" className="ll-btn ll-btn-a">List your property</a>
          </div>
          <button className="ll-ham" type="button" onClick={() => setMenu((v) => !v)}
            aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <span className="ll-bar" aria-hidden="true" />
      </nav>

      {menu && (
        <div className="ll-menu">
          {NAV.map(([href, label]) => <a key={href} href={href} onClick={closeMenu}>{label}</a>)}
          <a href={`tel:${site.contact.phoneRaw}`} onClick={closeMenu}>Call us</a>
          <SpaLink to="/client-login" onClick={closeMenu}>Client login</SpaLink>
          <a className="ll-btn ll-btn-a" href="#enquire" onClick={closeMenu}>List your property</a>
        </div>
      )}

      {/* corridor strip */}
      <div className="ll-strip">
        <div className="ll-wrap ll-strip-in">
          <span className="ll-strip-l">
            <b><i className="ll-dot" /> Now working in</b>
            <span>{CORRIDORS.join(' · ')}</span>
          </span>
          <a href={`tel:${site.contact.phoneRaw}`}><Phone size={12} /> {site.contact.phone}</a>
        </div>
      </div>

      {/* hero */}
      <header id="top" className="ll-hero">
        <div className="ll-wrap ll-hero-grid">
          <section className="ll-panel ll-story" data-reveal>
            <span className="ll-kicker">For property owners across India</span>
            <h1>Sell your property at the <em>right price.</em></h1>
            <p className="ll-lead">Research first. Paperwork second. Buyers third.</p>
            <p>{site.brand.description}</p>

            <div className="ll-shot">
              <img src={heroVisual} alt="A property listed through LANDLOGY" />
              <div className="ll-shot-scrim" />
              <div className="ll-shot-cap">
                <span>Property intelligence</span>
                <strong>Clearer positioning for serious decisions.</strong>
              </div>
            </div>

            <div className="ll-pillars">
              <div><Search size={16} /><b>Research</b><small>Location and demand</small></div>
              <div><ShieldCheck size={16} /><b>Verify</b><small>Title and documents</small></div>
              <div><Users size={16} /><b>Connect</b><small>Relevant buyers</small></div>
              <div><Scale size={16} /><b>Close</b><small>Through to handover</small></div>
            </div>

            <div className="ll-trust">
              {site.numbersBand.items.slice(0, 3).map((item) => (
                <div key={item.label}>
                  <Check size={15} />
                  <span><b>{item.label}</b><small>{item.value}</small></span>
                </div>
              ))}
            </div>
          </section>

          <aside id="enquire" className="ll-panel ll-intake" data-reveal>
            <div className="ll-intake-top">
              <div>
                <span className="ll-kicker">Direct enquiry</span>
                <h2>Tell us about your property</h2>
              </div>
              <img src={logo} alt="" />
            </div>
            <div className="ll-tabs" role="tablist">
              {TABS.map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key}
                  className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label}</button>
              ))}
            </div>
            <p>{active[2]}</p>
            <EnquiryForm intent={active[1]} />
            <div className="ll-intake-foot">
              <span><ShieldCheck size={13} /> Reviewed privately</span>
              <span>Reply within one working day</span>
            </div>
          </aside>
        </div>

        <div className="ll-wrap">
          <div className="ll-band" data-reveal>
            {site.numbersBand.items.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* clusters */}
      <section id="services" className="ll-sec ll-stone">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">What we do</span>
              <h2>Everything a property sale needs, in one place.</h2>
            </div>
            <p>Three groups of work, running in order, so nothing gets promoted before it is understood.</p>
          </div>
          <div className="ll-clusters" data-stagger>
            {CLUSTERS.map((c) => (
              <article className="ll-panel ll-cluster" data-reveal key={c.n}>
                <div className="ll-cluster-top"><b>{c.n}</b><small>{c.code}</small></div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <div className="ll-rows">
                  {c.names.map((name) => {
                    const s = svc(name);
                    return s ? (
                      <a className="ll-row" href="#enquire" key={name}>
                        <span><i>{s[0]}</i>{s[1]}</span>
                        <ArrowUpRight size={14} />
                      </a>
                    ) : null;
                  })}
                </div>
                <div className="ll-cluster-foot"><ShieldCheck size={13} /> {c.foot}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* land aggregation */}
      <section id="land" className="ll-sec">
        <div className="ll-wrap ll-split">
          <div className="ll-copy" data-reveal>
            <span className="ll-kicker">Signature capability</span>
            <h2>Land aggregation</h2>
            <p>Neighbouring parcels are often worth more together than apart. We identify which pieces connect, organise the information behind each one, and shape a single coherent opportunity.</p>
            <div className="ll-checks">
              <span><Check size={16} /> Identify connected land opportunities</span>
              <span><Check size={16} /> Organise property and location information</span>
              <span><Check size={16} /> Shape a coordinated next step</span>
            </div>
            <a href="#enquire" className="ll-btn ll-btn-c">Discuss land strategy <ArrowUpRight size={15} /></a>
          </div>
          <div className="ll-visual" data-reveal>
            <div className="land-visual">
              <div className="land-map-grid" />
              <div className="land-parcel parcel-a">A</div>
              <div className="land-parcel parcel-b">B</div>
              <div className="land-parcel parcel-c">C</div>
              <div className="land-parcel parcel-d">D</div>
              <div className="land-connect connect-one" />
              <div className="land-connect connect-two" />
              <span className="land-label label-location">LOCATION</span>
              <span className="land-label label-verified">VERIFIED</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3d visualisation */}
      <section className="ll-sec ll-stone">
        <div className="ll-wrap ll-split flip">
          <div className="ll-copy" data-reveal>
            <span className="ll-kicker">Visual clarity</span>
            <h2>3D visualisation with context</h2>
            <p>A serious buyer needs to understand the space, not just see photographs of it. We present a property with its surroundings, its use case and its potential made legible.</p>
            <div className="ll-checks">
              <span><Check size={16} /> Clarify space and positioning</span>
              <span><Check size={16} /> Show what the property could become</span>
              <span><Check size={16} /> Reduce the guesswork for buyers</span>
            </div>
            <a href="#enquire" className="ll-btn ll-btn-c">Request a presentation <ArrowUpRight size={15} /></a>
          </div>
          <div className="ll-visual" data-reveal>
            <div className="viz-frame">
              <div className="viz-building viz-building-one"><i /><i /><i /><i /></div>
              <div className="viz-building viz-building-two"><i /><i /><i /></div>
              <span className="viz-hotspot hotspot-one">01</span>
              <span className="viz-hotspot hotspot-two">02</span>
              <span className="viz-axis">SPATIAL VIEW</span>
            </div>
          </div>
        </div>
      </section>

      {/* network */}
      <section id="network" className="ll-sec ll-ink">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">Who we serve</span>
              <h2>Built around everyone in a property decision.</h2>
            </div>
            <p>Owners, investors, developers, brokers and buyers, working through one process.</p>
          </div>
          <div className="ll-stake" data-stagger>
            {site.networks.map((n, i) => (
              <article className="ll-tile" data-reveal key={n.title}>
                <div className="ll-stake-top"><b>0{i + 1}</b><small>{n.title}</small></div>
                <h3>{n.title}</h3>
                <p>{n.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* journey */}
      <section id="process" className="ll-sec">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">How it works</span>
              <h2>Five stages, and you know where you stand at each one.</h2>
            </div>
            <p>From your first message through preparation, marketing and closing support.</p>
          </div>
          <div className="ll-journey" data-stagger>
            {site.sellerSteps.map(([n, title, text]) => (
              <article className="ll-tile" data-reveal key={n}>
                <b>{n}</b>
                <small>Stage</small>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="ll-journey-foot">Seller journey</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* team */}
      <section id="team" className="ll-sec ll-stone">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">Our team</span>
              <h2>The people who will handle your property.</h2>
            </div>
            <p>Research, advisory, verification and strategy in one small team.</p>
          </div>
          <div className="ll-team" data-stagger>
            {site.team.map((m) => (
              <article className="ll-tile" data-reveal key={m.name}>
                <div className="ll-av">
                  <span>{m.initial}</span>
                  {m.photo && <img src={m.photo} alt={m.name} loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                </div>
                <h3>{m.name}</h3>
                <span className="ll-role">{m.role}</span>
                <p className="ll-bio">{m.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="ll-sec">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">In their words</span>
              <h2>What people say about working with us.</h2>
            </div>
            <p>Feedback from owners, investors and partners we have worked with.</p>
          </div>
          <div className="ll-revs" data-stagger>
            {site.reviews.map((r) => (
              <article className="ll-tile" data-reveal key={r.name}>
                <div className="ll-stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}</div>
                <blockquote>{r.text}</blockquote>
                <div className="ll-rev-foot">
                  <strong>{r.name}</strong>
                  <span>{r.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="ll-sec ll-stone">
        <div className="ll-wrap">
          <div className="ll-head" data-reveal>
            <div>
              <span className="ll-kicker">Contact</span>
              <h2>Start with a conversation.</h2>
            </div>
            <p>Call, write, or use the form at the top. We reply within a working day.</p>
          </div>
          <div className="ll-contact">
            <div data-reveal>
              <div className="ll-info">
                <div>
                  <span className="ll-info-i"><Phone size={17} /></span>
                  <div><strong>Call or WhatsApp</strong><a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a></div>
                </div>
                <div>
                  <span className="ll-info-i"><Mail size={17} /></span>
                  <div><strong>Email</strong><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></div>
                </div>
                <div>
                  <span className="ll-info-i"><MapPin size={17} /></span>
                  <div><strong>Office</strong><p>{site.contact.address}</p></div>
                </div>
                <div>
                  <span className="ll-info-i"><Clock size={17} /></span>
                  <div><strong>Hours</strong><p>{site.contact.workingHours.weekday}<br />{site.contact.workingHours.sunday}</p></div>
                </div>
              </div>
              <div className="ll-map">
                <iframe src={site.contact.mapEmbedUrl} title="LANDLOGY office location"
                  loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>

            <div className="ll-panel ll-fb" data-reveal>
              <div className="ll-fb-head">
                <span className="ll-kicker">Feedback</span>
                <h2>Tell us how we are doing</h2>
                <p>Anything confusing, missing or wrong on this site — we want to hear it.</p>
              </div>
              <FeedbackForm />
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="ll-foot">
        <div className="ll-wrap">
          <div className="ll-foot-grid">
            <div className="ll-foot-b">
              <strong>LANDLOGY</strong>
              <small>Property selling support</small>
              <p>{site.brand.tagline}</p>
            </div>
            <div>
              <h4>For owners</h4>
              <a href="#enquire">List your property</a>
              <a href="#services">What we do</a>
              <a href="#land">Land &amp; visualisation</a>
              <a href="#process">How it works</a>
            </div>
            <div>
              <h4>Access</h4>
              <SpaLink to="/client-login">Client login</SpaLink>
              <a href="#contact">Contact us</a>
              <a href="#team">Our team</a>
            </div>
            <div>
              <h4>Reach us</h4>
              <a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a>
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            </div>
          </div>
          <div className="ll-foot-btm">
            <p>© 2026 LANDLOGY. All rights reserved.</p>
            <p>{site.contact.workingHours.weekday}</p>
          </div>
        </div>
      </footer>

      <a className="ll-wa" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`}>
        <MessageCircle size={22} />
      </a>
    </main>
  );
}

export default SellerLandingPage;