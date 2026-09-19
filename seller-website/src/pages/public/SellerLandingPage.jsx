import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, Check, Clock, Mail, MapPin,MessageCircle,
  Menu, MousePointer2, Phone, Scale, Search, ShieldCheck, Users, X
} from 'lucide-react';
import logo from '../../assets/Logo.png';
import heroVisual from '../../assets/Hero1.png';
import { API_BASE } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

/* ───────── hooks ───────── */

function useReveal(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const nodes = [...document.querySelectorAll('[data-reveal]')].filter((el) => !el.classList.contains('is-visible'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [enabled]);
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
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : '0');
      document.body.classList.toggle('is-scrolled', scrollY > 24);
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

/* plays the visual once on touch devices when scrolled into view */
function useTouchPlay(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if (matchMedia('(pointer:fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    const nodes = document.querySelectorAll('.agg, .h3d');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-play'); io.unobserve(e.target); }
      });
    }, { threshold: 0.45 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [enabled]);
}
function useScrollSpy(enabled, ids) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (sections.length === 0) return;
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] });
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [enabled, ids]);
  return active;
}

const SPY_IDS = ['top', 'services', 'capabilities', 'process', 'team', 'contact'];

function useSiteData() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setError(null);
    fetch('/site-data.json')
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(setSite).catch(setError);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { site, error, load };
}

/* ───────── form ───────── */

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
          <option value="">{placeholder || 'Choose one'}</option>
          {options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? <textarea {...common} /> : <input type={type} {...common} />}
      {error && <span id={eid} className="field-error" role="alert">{error}</span>}
    </div>
  );
}

const PHONE_RE = /^(?:\+91\s?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROPERTY_TYPES = ['Residential apartment', 'Independent house / villa', 'Plot / land', 'Commercial space', 'Office space', 'Warehouse / industrial'];

/* each mode decides which fields render and how the message is built */
const MODES = {
  sell: {
    intent: 'Sell my property',
    blurb: 'Tell us what you own and where it is. We come back with a realistic view of price and the next step.',
    cta: 'Send enquiry',
    fields: ['type', 'city', 'notes']
  },
  value: {
    intent: 'Property valuation',
    blurb: 'A research-backed price range before you decide whether to list. No obligation to sell.',
    cta: 'Request valuation',
    fields: ['type', 'city', 'size', 'age']
  },
  advice: {
    intent: 'Advice',
    blurb: 'Not ready to sell yet? Ask about timing, paperwork or what the market is doing in your area.',
    cta: 'Ask the team',
    fields: ['topic', 'city', 'question']
  },
  feedback: {
    intent: 'Website feedback',
    blurb: '',
    cta: 'Send feedback',
    fields: ['rating', 'improve']
  }
};

function LandlogyForm({ mode }) {
  const cfg = MODES[mode];
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState('Very helpful');
  const ref = useRef(null);

  useEffect(() => { setStatus(''); setErrors({}); }, [mode]);

  const clearError = (n) => setErrors((p) => { if (!(n in p)) return p; const q = { ...p }; delete q[n]; return q; });
  const has = (f) => cfg.fields.includes(f);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus(''); setMsg(''); setErrors({});
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    const err = {};

    const name = String(d.name || '').trim();
    if (!name) err.name = 'Please enter your name.';
    else if (name.length < 2 || name.length > 80) err.name = 'Name must be 2–80 characters.';
    if (!PHONE_RE.test(String(d.phone || '').replace(/\s+/g, ''))) err.phone = 'Enter a valid 10-digit mobile number.';
    if (d.email && !EMAIL_RE.test(String(d.email).trim())) err.email = 'Enter a valid email address.';
    if (has('city') && !String(d.city || '').trim()) err.city = 'Please enter the city.';
    if (has('type') && !String(d.property_type || '').trim()) err.property_type = 'Please choose a property type.';
    if (has('topic') && !String(d.topic || '').trim()) err.topic = 'Please choose a topic.';
    if (has('question') && String(d.question || '').trim().length < 10) err.question = 'Please write at least 10 characters.';
    if (has('improve') && String(d.improve || '').trim().length < 10) err.improve = 'Please write at least 10 characters.';

    if (Object.keys(err).length) {
      setErrors(err); setBusy(false);
      ref.current?.querySelector(`[name="${Object.keys(err)[0]}"]`)?.focus?.();
      return;
    }

    /* every mode posts the same shape the backend already accepts */
    const parts = [];
    if (d.size) parts.push(`Approx size: ${d.size}`);
    if (d.age) parts.push(`Property age: ${d.age}`);
    if (d.notes) parts.push(String(d.notes));
    if (d.question) parts.push(String(d.question));
    if (d.improve) parts.push(`[${rating}] ${d.improve}`);

    const payload = {
      name, phone: d.phone, email: d.email || '',
      city: d.city || '',
      property_type: d.property_type || d.topic || '',
      intent: cfg.intent,
      formType: mode === 'feedback' ? 'feedback' : 'property-enquiry',
      message: parts.join(' · ')
    };

    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Submission failed');
      setStatus('success'); form.reset(); setRating('Very helpful');
    } catch (error) { setStatus('error'); setMsg(error.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <form ref={ref} onSubmit={submit} noValidate>
      {has('rating') && (
          <div className="ll-rate">
          {[['😄', 'Very helpful'], ['🙂', 'Somewhat helpful'], ['😕', 'Needs work']].map(([face, r]) => (
            <label key={r} className={rating === r ? 'on' : ''}>
              <input type="radio" name="ratingChoice" checked={rating === r} onChange={() => setRating(r)} />
              <em role="img" aria-hidden="true">{face}</em>
              {r}
            </label>
          ))}
        </div>
      )}

      <div className="field-row">
        <Field label="Your name" name="name" placeholder="e.g. Rohit Verma" autoComplete="name" error={errors.name} clearError={clearError} />
        <Field label="Mobile" name="phone" placeholder="e.g. 98765 43210" inputMode="tel" autoComplete="tel-national" error={errors.phone} clearError={clearError} />
      </div>

      <Field label="Email (optional)" name="email" type="email" placeholder="e.g. rohit@gmail.com" autoComplete="email" error={errors.email} clearError={clearError} />

      {has('type') && (
        <Field label="Property type" name="property_type" select options={PROPERTY_TYPES}
          placeholder="Choose one" error={errors.property_type} clearError={clearError} />
      )}

      {has('topic') && (
        <Field label="What is this about?" name="topic" select
          options={['When should I sell?', 'Documents and paperwork', 'What is my area worth?', 'Something else']}
          placeholder="Choose one" error={errors.topic} clearError={clearError} />
      )}

      {has('city') && (
        <Field label="City or locality" name="city" placeholder="e.g. Gomti Nagar, Lucknow"
          autoComplete="address-level2" error={errors.city} clearError={clearError} />
      )}

      {has('size') && (
        <div className="field-row">
          <Field label="Approx size" name="size" placeholder="e.g. 1450 sq ft" />
          <Field label="Age" name="age" select options={['Under construction', 'Under 5 years', '5–10 years', 'Over 10 years']} placeholder="Choose one" />
        </div>
      )}

      {has('notes') && (
        <Field label="Anything else (optional)" name="notes" textarea placeholder="e.g. Ground floor, corner plot, ready to move" />
      )}

      {has('question') && (
        <Field label="Your question" name="question" textarea placeholder="Ask us anything about selling"
          error={errors.question} clearError={clearError} />
      )}

      {has('improve') && (
        <Field label="What could be better?" name="improve" textarea placeholder="Tell us what worked and what didn't"
          error={errors.improve} clearError={clearError} />
      )}

      {status === 'success' && <div className="form-status success" role="status"><Check size={15} /> Received. We reply within one working day.</div>}
      {status === 'error' && <div className="form-status error" role="alert"><X size={15} /> {msg}</div>}

      <button type="submit" className={`ll-btn ${mode === 'feedback' ? 'll-btn-b' : 'll-btn-a'} ll-btn-wide`} disabled={busy}>
        {busy ? 'Sending…' : cfg.cta}
      </button>
    </form>
  );
}

/* ───────── visuals ───────── */

function LandAggregation() {
  return (
    <div className="agg" data-reveal>
      <div className="agg-grid" />
      <div className="agg-stage">
        <span className="agg-p agg-a">A</span>
        <span className="agg-p agg-b">B</span>
        <span className="agg-p agg-c">C</span>
        <span className="agg-p agg-d">D</span>
        <span className="agg-link agg-l1" />
        <span className="agg-link agg-l2" />
      </div>
      <span className="agg-tag agg-t1">Location intelligence</span>
      <span className="agg-tag agg-t2">Verification layer</span>
      <div className="agg-state">
        <div className="agg-before"><b>4 parcels</b><span>Fragmented</span></div>
        <div className="agg-after"><b>1 holding</b><span>Aggregated</span></div>
      </div>
    </div>
  );
}

function House3D() {
  return (
    <div className="h3d" data-reveal>
      <div className="h3d-floorgrid" />
      <div className="h3d-scene">
        <div className="h3d-stage">
          <div className="h3d-slab" />
          <div className="h3d-w h3d-wn"><i /></div>
          <div className="h3d-w h3d-ws"><i /></div>
          <div className="h3d-w h3d-we"><i /></div>
          <div className="h3d-w h3d-ww"><i /></div>
          <div className="h3d-roof">
            <div className="h3d-r h3d-ra" />
            <div className="h3d-r h3d-rb" />
          </div>
          <span className="h3d-pin h3d-p1">01</span>
          <span className="h3d-pin h3d-p2">02</span>
        </div>
      </div>
      <span className="h3d-tag h3d-t1">Spatial view</span>
      <div className="h3d-state">
        <div className="h3d-before"><b>Floor plan</b><span>Flat drawing</span></div>
        <div className="h3d-after"><b>Built view</b><span>In context</span></div>
      </div>
    </div>
  );
}

/* ───────── page ───────── */

const NAV = [
  ['#services', 'What we do'],
  ['#capabilities', 'Capabilities'],
  ['#process', 'How it works'],
  ['#team', 'Our team'],
  ['#contact', 'Contact']
];

const TABS = [['sell', 'Sell'], ['value', 'Valuation'], ['advice', 'Advice']];

const CLUSTERS = [
  { n: '01', code: 'Pricing', title: 'Getting it priced right',
    text: 'Before anything is promoted, we work out what the property is genuinely worth and how it should be positioned.',
    names: ['Property Assessment', 'Pricing & Positioning', 'Professional Presentation'],
    foot: 'Research before recommendation' },
  { n: '02', code: 'Verification', title: 'Getting it verified',
    text: 'Ownership, documents and location context are organised early, so nothing surfaces late in a negotiation.',
    names: ['Verification Support', 'Land Aggregation', 'Property Intelligence & Presentation'],
    foot: 'Checked before promotion' },
  { n: '03', code: 'Closing', title: 'Getting it sold',
    text: 'The property reaches buyers whose requirements actually match it, and you have support through to handover.',
    names: ['Relevant Buyer Reach', 'Negotiation & Closing Support', '3D Property Visualization'],
    foot: 'Guidance through the sale' }
];

const STAKE_TAGS = ['Sell-side', 'Capital', 'Development', 'Channel', 'Demand', 'Partners'];
const STAGE_OUTCOME = ['Enquiry received', 'Under review', 'Documents organised', 'Strategy agreed', 'Live and supported'];
const CORRIDORS = ['Lucknow', 'Delhi NCR', 'Mumbai', 'Bangalore'];

export function SellerLandingPage() {
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState('sell');
  const { site, error, load } = useSiteData();
  useReveal(!!site);
  useMotionVars();
  useTouchPlay(!!site);
  const spy = useScrollSpy(!!site, SPY_IDS);

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

  const svc = (name) => site.sellerServices.find((s) => s[1] === name);
  const closeMenu = () => setMenu(false);

  return (
    <main className="ll">
      {/* nav */}
      <nav className="ll-nav">
        <div className="ll-wrap ll-nav-in">
          <a className="ll-logo" href="#top" aria-label="LANDLOGY home"><img src={logo} alt="LANDLOGY" /></a>
          <div className="ll-links">
            {NAV.map(([href, label]) => (
              <a key={href} href={href} className={spy === href.slice(1) ? 'on' : ''}>{label}</a>
            ))}
          </div>
          <div className="ll-nav-cta">
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

      {/* corridor */}
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
            <p className="ll-lead">{site.brand.description}</p>

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
            <p>{MODES[tab].blurb}</p>
            <LandlogyForm mode={tab} key={tab} />
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
                <span>{item.label}</span>
                <strong>{item.value}</strong>
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
            <p>Three groups of work, running in order, so nothing is promoted before it is understood.</p>
          </div>
             <div className="ll-clusters" data-stagger>
            <span className="ll-thread" data-reveal aria-hidden="true" />
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
                        <span><i>{s[0]}</i>{s[1]}</span><ArrowUpRight size={14} />
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
      <section id="capabilities" className="ll-sec">
        <div className="ll-wrap ll-split">
          <div className="ll-copy" data-reveal>
            <span className="ll-kicker">Signature capability</span>
            <h2>Land aggregation</h2>
            <p>Neighbouring parcels are often worth more together than apart. We work out which pieces connect, organise the information behind each one, and shape a single coherent opportunity.</p>
            <div className="ll-checks">
              <span><Check size={16} /> Identify connected land opportunities</span>
              <span><Check size={16} /> Organise property and location information</span>
              <span><Check size={16} /> Shape a coordinated next step</span>
            </div>
            <a href="#enquire" className="ll-btn ll-btn-c">Discuss land strategy <ArrowUpRight size={15} /></a>
            <span className="ll-hint"><MousePointer2 size={13} /> Hover the map to watch four parcels become one</span>
          </div>
          <LandAggregation />
        </div>
      </section>

      {/* 3d */}
      <section className="ll-sec ll-stone">
        <div className="ll-wrap ll-split flip">
          <div className="ll-copy" data-reveal>
            <span className="ll-kicker">Visual clarity</span>
            <h2>3D visualisation with context</h2>
            <p>A buyer needs to understand the space, not just look at photographs of it. We take the flat plan and build it out, so the shape, scale and potential of a property are obvious at a glance.</p>
            <div className="ll-checks">
              <span><Check size={16} /> Clarify space and positioning</span>
              <span><Check size={16} /> Show what the property could become</span>
              <span><Check size={16} /> Reduce the guesswork for buyers</span>
            </div>
            <a href="#enquire" className="ll-btn ll-btn-c">Request a presentation <ArrowUpRight size={15} /></a>
            <span className="ll-hint"><MousePointer2 size={13} /> Hover the plan to raise the building</span>
          </div>
          <House3D />
        </div>
      </section>

      {/* network */}
      <section className="ll-sec ll-ink">
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
                <ArrowUpRight className="ll-stake-arrow" size={16} />
                <div className="ll-stake-top">
                  <b>0{i + 1}</b>
                  <small>{STAKE_TAGS[i] || 'Network'}</small>
                </div>
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
            <span className="ll-thread" data-reveal aria-hidden="true" />
            {site.sellerSteps.map(([n, title, text], i) => (
              <article className="ll-tile" data-reveal key={n}>
                <b><span>{n}</span></b>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="ll-journey-foot"><Check size={12} /> {STAGE_OUTCOME[i]}</div>
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
              <LandlogyForm mode="feedback" />
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="ll-foot">
        <div className="ll-wrap">
          <div className="ll-foot-grid">
            <div className="ll-foot-b">
              <img src={logo} alt="LANDLOGY" />
              <p>{site.brand.tagline}</p>
            </div>
            <div>
              <h4>For owners</h4>
              <a href="#enquire">List your property</a>
              <a href="#services">What we do</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#process">How it works</a>
            </div>
            <div>
              <h4>Access</h4>
              <SpaLink to="/client-login">Client login</SpaLink>
              <a href="#team">Our team</a>
              <a href="#contact">Contact us</a>
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
      <div className="ll-mbar">
        <a href={`tel:${site.contact.phoneRaw}`}>
          <Phone size={17} /><span>Call</span>
        </a>
        <a href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`}
          target="_blank" rel="noreferrer" className="wa">
          <MessageCircle size={17} /><span>WhatsApp</span>
        </a>
        <a href="#enquire" className="pri">
          <ArrowUpRight size={17} /><span>List property</span>
        </a>
      </div>
      <a className="ll-wa" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
        href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`}>
         <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z"/>
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23z"/>
        </svg>
      </a>
    </main>
  );
}

export default SellerLandingPage;