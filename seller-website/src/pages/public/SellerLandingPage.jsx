import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bell, Check, ChevronRight, CircleHelp, Download, Eye, EyeOff, FileText, KeyRound, LayoutDashboard, LogOut, Menu, X, Phone, Mail, MapPin, Clock, MessageCircle, Search, ShieldCheck, TrendingUp, Building2, Home, Landmark, Users, Scale, Send, UserRound } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { API_BASE } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

function useReveal(enabled = true, rescan = '') {
  useEffect(() => {
    if (!enabled) return;
    const elements = [...document.querySelectorAll('[data-reveal]')].filter((element) => !element.classList.contains('is-visible'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [enabled, rescan]);
}


function useMotionVars() {
  useEffect(() => {
    const root = document.documentElement;
    const fine = matchMedia('(pointer:fine)').matches;
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    let frame = 0, mx = 0, my = 0, px = 0, py = 0;

    const apply = () => {
      frame = 0;
      root.style.setProperty('--mx', mx.toFixed(3));
      root.style.setProperty('--my', my.toFixed(3));
      root.style.setProperty('--mxpx', px + 'px');
      root.style.setProperty('--mypx', py + 'px');
    };

    const onMove = (e) => {
      mx = (e.clientX / innerWidth) * 2 - 1;
      my = (e.clientY / innerHeight) * 2 - 1;
      px = e.clientX; py = e.clientY;
      const card = e.target.closest?.('[data-spot]');
      if (card) {
        const b = card.getBoundingClientRect();
        card.style.setProperty('--cx', ((e.clientX - b.left) / b.width) * 100 + '%');
        card.style.setProperty('--cy', ((e.clientY - b.top) / b.height) * 100 + '%');
      }
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onScroll = () => {
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty('--sy', y + 'px');
      root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : '0');
      document.body.classList.toggle('is-scrolled', y > 24);
      const stack = document.querySelector('.steps-stack');
      if (stack) {
        const b = stack.getBoundingClientRect();
        const p = (innerHeight * 0.62 - b.top) / b.height;
        stack.style.setProperty('--rail', Math.max(0, Math.min(1, p)).toFixed(3));
      }
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
function useCounters(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const nodes = document.querySelectorAll('.counter:not([data-done])');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.dataset.done = '1';

        const raw = el.dataset.target || el.textContent;
        const match = raw.match(/^([^\d]*)([\d.]+)(.*)$/);
        if (!match) return;
        const [, prefix, numStr, suffix] = match;
        const target = parseFloat(numStr);
        const decimals = (numStr.split('.')[1] || '').length;

        if (still) { el.textContent = raw; return; }

        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / 1400, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [enabled]);
}
function useSiteData() {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetch('/site-data.json')
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
        return response.json();
      })
      .then((json) => {
        console.log('[LANDLOGY] site-data.json loaded successfully');
        setSite(json);
      })
      .catch((err) => {
        console.error('[LANDLOGY] Failed to load /site-data.json. Make sure client/public/site-data.json exists and is served at /site-data.json.', err);
        setError(err);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { site, error, load };
}

function Magnetic({ children, className = '', ...props }) {
  const ref = useRef();

  const move = (event) => {
    if (matchMedia('(pointer:fine)').matches) {
      const bounds = ref.current.getBoundingClientRect();
      ref.current.style.transform = `translate(${(event.clientX - bounds.left - bounds.width / 2) * 0.12}px, ${(event.clientY - bounds.top - bounds.height / 2) * 0.12}px)`;
    }
  };

  const leave = () => {
    if (ref.current) {
      ref.current.style.transform = '';
    }
  };

  return (
    <a ref={ref} onMouseMove={move} onMouseLeave={leave} className={`btn ${className}`} {...props}>
      {children}
    </a>
  );
}

function Field({ label, name, select, options, textarea, type = 'text', placeholder, error, clearError, autocomplete, inputmode, ...props }) {
  const errorId = `${name}-err`;

  return (
    <div className={`field-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {select ? (
        <select
          id={name}
          name={name}
          defaultValue=""
          onChange={clearError ? () => clearError(name) : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          <option value="">{placeholder || 'Select an option...'}</option>
          {options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          onChange={clearError ? () => clearError(name) : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          inputMode={inputmode}
          autoComplete={autocomplete}
          onChange={clearError ? () => clearError(name) : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function Form({ hero = false }) {
  const [status, setStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);

  const validate = (data) => {
    const nextErrors = {};
    const name = String(data.name || '').trim();
    if (!name) nextErrors.name = 'Please enter your full name.';
    else if (name.length < 2 || name.length > 80) nextErrors.name = 'Name must be 2–80 characters.';
    else if (!/[\p{L}]/u.test(name)) nextErrors.name = 'Please enter a valid name (letters only).';

    if (!/^(?:\+91\s?)?[6-9]\d{9}$/.test(String(data.phone || '').replace(/\s+/g, ''))) {
      nextErrors.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (data.email && String(data.email).trim()) {
      const email = String(data.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Please enter a valid email address.';
      else if (email.length > 160) nextErrors.email = 'Email is too long.';
    }

    const city = String(data.city || '').trim();
    if (!city) nextErrors.city = 'Please enter your city or location.';
    else if (city.length > 120) nextErrors.city = 'City is too long.';

    const intentField = hero ? 'property_type' : 'intent';
    if (!String(data[intentField] || '').trim()) nextErrors[intentField] = 'Please select an option.';

    if (hero) {
      if (data.message && String(data.message).length > 2000) nextErrors.message = 'Message is too long (max 2000 characters).';
    } else {
      const message = String(data.message || '');
      if (!message.trim()) nextErrors.message = 'Please enter your message.';
      else if (message.trim().length < 10) nextErrors.message = 'Message must be at least 10 characters.';
      else if (message.trim().length > 2000) nextErrors.message = 'Message is too long (max 2000 characters).';
    }

    return nextErrors;
  };

  const focusFirstInvalid = (nextErrors) => {
    if (!formRef.current || !Object.keys(nextErrors).length) return;
    const firstKey = Object.keys(nextErrors)[0];
    const element = formRef.current.querySelector(`[name="${firstKey}"]`);
    if (element && typeof element.focus === 'function') element.focus();
  };

  const clearError = (name) => {
    setErrors((previous) => {
      if (!(name in previous)) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    setErrorMsg('');
    setErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const validationErrors = validate(data);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstInvalid(validationErrors);
      setBusy(false);
      return;
    }

    data.formType = hero ? 'property-enquiry' : 'contact-message';
    if (hero) data.intent = 'Sell my Property';

    try {
      const response = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Submission failed');

      setStatus('success');
      if (form && typeof form.reset === 'function') form.reset();
    } catch (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="form">
      <div className="field-row">
        <Field label={hero ? 'Your Name' : 'Full Name *'} name="name" placeholder="Enter your full name" required autoComplete="name" error={errors.name} clearError={clearError} />
        <Field label={hero ? 'Mobile' : 'Mobile Number *'} name="phone" placeholder="98765 43210" required inputMode="tel" autoComplete="tel-national" error={errors.phone} clearError={clearError} />
      </div>
      <Field label="Email Address" name="email" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email} clearError={clearError} />
      <Field label={hero ? 'Property Type' : 'Enquiry Type'} name={hero ? 'property_type' : 'intent'} select options={hero ? ['Residential Apartment', 'Independent House / Villa', 'Plot / Land', 'Commercial Space', 'Office Space', 'Warehouse / Industrial'] : ['Sell my Property', 'Property Assessment', 'Pricing & Positioning', 'Verification Support', 'Professional Presentation', 'Marketing & Buyer Reach', 'Negotiation & Closing Support', 'Other']} placeholder={hero ? 'Select property type' : 'Select a seller-service enquiry'} error={errors[hero ? 'property_type' : 'intent']} clearError={clearError} />
      <Field label="City / Location of Interest" name="city" placeholder="Enter your city or location" autoComplete="address-level2" error={errors.city} clearError={clearError} />
      <Field label={hero ? 'Message (optional)' : 'Your Message'} name="message" textarea placeholder="Tell us how we can help you..." autoComplete="off" error={errors.message} clearError={clearError} />
      {status === 'success' && <div className="form-status success" role="status">✓ Your enquiry has been received and will be reviewed by LANDLOGY.</div>}
      {status === 'error' && <div className="form-status error" role="alert">✕ {errorMsg}</div>}
      <button type="submit" className="btn btn-primary submit-btn" disabled={busy}>{busy ? 'Sending...' : hero ? 'Send Enquiry' : 'Send Message'}</button>
    </form>
  );
}

function Head({ eyebrow, title, text, dark }) {
  return (
    <div className="sec-head" data-reveal>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className={dark ? 'dark-title' : ''}>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function Info({ icon, title, children }) {
  return (
    <div className="cinfo-block">
      <div className="cinfo-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function SellerCapabilities({ site }) {
  return (
    <>
      <section id="land-aggregation" className="capability-section land-capability">
        <div className="container capability-grid">
          <div className="capability-copy" data-reveal>
            <span className="eyebrow">LANDLOGY Signature Capability</span>
            <h2>Land Aggregation</h2>
            <p>Bringing fragmented land opportunities together through structured property intelligence, verification and coordinated development or sale strategy.</p>
            <div className="capability-points">
              <span><strong>01</strong>Identify connected land opportunities</span>
              <span><strong>02</strong>Organise property and location information</span>
              <span><strong>03</strong>Shape a coordinated next-step strategy</span>
            </div>
            <a href="#contact" className="btn btn-primary">Discuss Land Strategy <ArrowUpRight size={15} /></a>
          </div>
          <div className="land-visual" data-reveal>
            <div className="land-map-grid" />
            <div className="land-parcel parcel-a">A</div>
            <div className="land-parcel parcel-b">B</div>
            <div className="land-parcel parcel-c">C</div>
            <div className="land-parcel parcel-d">D</div>
            <div className="land-connect connect-one" />
            <div className="land-connect connect-two" />
            <span className="land-label label-location">LOCATION INTELLIGENCE</span>
            <span className="land-label label-verified">VERIFICATION LAYER</span>
            <span className="land-coordinates">LAND / STRATEGY / CONTEXT</span>
          </div>
        </div>
      </section>
      <section id="visualization" className="capability-section visualization-section">
        <div className="container visualization-grid">
          <div className="visualization-stage" data-reveal>
            <div className="viz-frame">
              <div className="viz-building viz-building-one"><i /><i /><i /><i /></div>
              <div className="viz-building viz-building-two"><i /><i /><i /></div>
              <span className="viz-hotspot hotspot-one">01</span>
              <span className="viz-hotspot hotspot-two">02</span>
              <span className="viz-axis">SPATIAL VIEW / 03</span>
            </div>
            <div className="viz-controls"><span>PROPERTY PRESENTATION CONCEPT</span><span>◊ &nbsp; 01 / 03 &nbsp; ▾</span></div>
          </div>
          <div className="capability-copy" data-reveal>
            <span className="eyebrow">Visual Clarity</span>
            <h2>3D Visualization with Context</h2>
            <p>Present a property with the surrounding context, use-case, and spatial clarity required for serious decision-making.</p>
            <div className="capability-points">
              <span><strong>01</strong>Clarify space and positioning</span>
              <span><strong>02</strong>Highlight property potential</span>
              <span><strong>03</strong>Support buyer understanding</span>
            </div>
            <a href="#contact" className="btn btn-secondary">Request Property Presentation <ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>
    </>
  );
}

export function SellerLandingPage() {
  const [menu, setMenu] = useState(false);
const { site, error, load } = useSiteData();
useReveal(!!site);
useMotionVars();
useCounters(!!site);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menu);
    return () => document.body.classList.remove('menu-open');
  }, [menu]);



  if (!site) {
    return (
      <div className="seller-loading">
        {error ? (
          <>
            <strong>LANDLOGY is temporarily unavailable.</strong>
            <button className="btn btn-primary" onClick={load}>Retry</button>
          </>
        ) : (
          'Loading LANDLOGY...'
        )}
      </div>
    );
  }

  const services = site.sellerServices;
  const steps = site.sellerSteps;

  return (
    <main className="seller-landing">
      <nav>
        <div className="container nav-inner">
          <a className="brand" href="#hero"><img src={logo} alt="LANDLOGY" /></a>
          <div className="navlinks">
            <a href="#how-it-works">How It Works</a>
            <a href="#services">Our Services</a>
            <a href="#why-sell">Why LANDLOGY</a>
               
            <a href="#who-we-serve">Who We Serve</a>
            <a href="#team">Our Team</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="nav-cta">
            <a href={`tel:${site.contact.phoneRaw}`} className="btn btn-outline"><Phone size={15} /> Call Us</a>
            <SpaLink to="/client-login" className="btn btn-client-login">Client Login</SpaLink>
            <a href="#contact" className="btn btn-primary">List Your Property <ArrowUpRight size={15} /></a>
          </div>
          <button className="ham" type="button" onClick={() => setMenu((value) => !value)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <span className="nav-progress" aria-hidden="true" />
      </nav>

      {menu && (
        <div className="mobile-menu seller-mobile-menu">
          <a href="#how-it-works" onClick={() => setMenu(false)}>How It Works</a>
          <a href="#services" onClick={() => setMenu(false)}>Our Services</a>
                 <a href="#why-sell" onClick={() => setMenu(false)}>Why LANDLOGY</a>
        
          <a href="#who-we-serve" onClick={() => setMenu(false)}>Who We Serve</a>
          <a href="#team" onClick={() => setMenu(false)}>Our Team</a>
          <a href="#contact" onClick={() => setMenu(false)}>Contact</a>
          <SpaLink className="client-login-link" to="/client-login">Client Login</SpaLink>
          <a className="mobile-primary-link" href="#contact" onClick={() => setMenu(false)}>List Your Property <ArrowUpRight size={15} /></a>
        </div>
      )}

      <header id="hero" className="seller-hero">
        <div className="seller-hero-backdrop" />
        <div className="container seller-hero-inner">
          <div className="seller-hero-copy" data-reveal>
  <span className="eyebrow">For Property Owners Across India</span>
  <h1>
    <span className="reveal-line"><span>Sell Your Property</span></span>
    <span className="reveal-line"><span className="accent">With Confidence.</span></span>
  </h1>
  <p>LANDLOGY helps property owners sell through a structured process, considered positioning, clear presentation and support at every important step.</p>
  <div className="hero-actions">
    <Magnetic href="#contact" className="btn-primary">List Your Property <ArrowUpRight size={16} /></Magnetic>
    <Magnetic href="#how-it-works" className="btn-outline">See How It Works <ChevronRight size={16} /></Magnetic>
  </div>
  <div className="seller-hero-stats">
    {site.heroStats.map((stat) => (
      <div className="sh-stat" key={stat.label}>
        <strong className="counter" data-target={stat.value}>0</strong>
        <span>{stat.label}</span>
      </div>
    ))}
  </div>
  <div className="seller-trust-strip">
    <span>Research-led approach</span>
    <span>Verification support</span>
    <span>Professional presentation</span>
    <span>Guided selling process</span>
  </div>
</div>
          <div className="hero-card seller-enquiry-card" data-reveal>
            <div className="hero-card-title">Tell Us About Your Property</div>
            <p className="seller-card-sub">Start with a property-selling enquiry. LANDLOGY will review the information you share.</p>
            <Form hero />
          </div>
        </div>
      </header>

      <section className="seller-pain-section">
        <div className="container">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">A Better Starting Point</span>
            <h2>Selling property should feel clearer.</h2>
            <p>Owners often need help understanding the right price, preparing information and reaching relevant buyers. LANDLOGY brings those conversations into one structured process.</p>
          </div>
          <div className="seller-pain-grid">
            {['Uncertainty about the right price', 'Unqualified or irrelevant enquiries', 'Property information and documents', 'Presenting the property properly', 'Negotiation and closing decisions', 'Knowing the right next step'].map((item, index) => (
             <article className="seller-pain-card" data-reveal data-spot key={item}>
                <span>0{index + 1}</span>
                <h3>{item}</h3>
                <p>Start with a clearer, more informed way to approach this part of selling.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="seller-trust-band">
        <div className="container seller-trust-grid">
          {[['Research', 'Decisions begin with understanding.'], ['Verification', 'Relevant information is organised early.'], ['Reach', 'Focus on relevant prospective buyers.'], ['Support', 'Guidance continues through the process.']].map(([title, text]) => (
            <div data-reveal key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <section id="how-it-works" className="sec-slate">
        <div className="container">
          <div className="sec-head seller-centered-head" data-reveal>
            <span className="eyebrow">The Selling Process</span>
            <h2>A clearer way to sell your property.</h2>
            <p>Five high-level steps explain what happens from your first enquiry through preparation and support.</p>
          </div>
          <div className="steps-stack">
            <div className="steps-rail" aria-hidden="true"><span /></div>
            <div className="steps-list">
              {steps.map(([number, title, text], i) => (
                <article className="step-row" data-reveal key={number} style={{ '--i': i }}>
                  <span className="step-num">{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services">
        <div className="container">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">What LANDLOGY Helps With</span>
            <h2>Seller-focused support, end to end.</h2>
            <p>Every service is designed around helping a property owner make informed decisions and move forward with confidence.</p>
          </div>
          <div className="services-grid">
            {services.map(([icon, title, text], index) => (
             <article className="svc-card seller-service-card" data-reveal data-spot key={title}>
                <div className="svc-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="#contact" className="svc-link">Discuss this with us <ArrowUpRight size={14} /></a>
                <span className="card-index">0{index + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SellerCapabilities site={site} />

      <section id="why-sell" className="sec-slate">
        <div className="container seller-why-grid">
          <div data-reveal>
            <span className="eyebrow">Why Property Owners Choose LANDLOGY</span>
            <h2>Selling with better clarity and support.</h2>
            <p className="seller-why-intro">LANDLOGY is a service for owners who want a thoughtful selling process rather than simply placing a listing and waiting.</p>
            {['Research before recommendation', 'Verification before promotion', 'Clearer property presentation', 'Human guidance when decisions matter'].map((title, index) => (
              <div className="seller-why-row" key={title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>We keep the focus on understanding your property, your objective and the next appropriate step.</p>
                </div>
              </div>
            ))}
          </div>
          <div className="seller-why-panel" data-reveal>
            <span className="eyebrow">A private client journey later</span>
            <h3>Stay informed as your property progresses.</h3>
            <p>After LANDLOGY reviews and accepts a client enquiry, approved clients may later receive secure access to a private portal for their own property information and status.</p>
            <SpaLink to="/client-login" className="btn btn-white">Client Login <ArrowUpRight size={15} /></SpaLink>
          </div>
        </div>
      </section>

      
      

         <section id="who-we-serve" className="sec-navy">
        <div className="container">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Who We Work With</span>
            <h2 className="dark-title">Built around the people in every property decision.</h2>
            <p>LANDLOGY brings owners, investors, developers and professionals into one structured process.</p>
          </div>
          <div className="network-grid" data-reveal-stagger>
            {site.networks.map((n) => (
              <article className="ncard" data-reveal data-spot key={n.title}>
                <div className="ncard-icon">{n.icon}</div>
                <h3>{n.title}</h3>
                <p>{n.desc}</p>
                <ArrowUpRight className="narrow" size={17} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="team">
        <div className="container">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">The LANDLOGY Team</span>
            <h2>The people who handle your property.</h2>
            <p>Every enquiry is reviewed by a small, accountable team — research, advisory, verification and strategy in one place.</p>
          </div>
          <div className="team-grid" data-reveal-stagger>
            {site.team.map((member) => (
              <article className="team-card" data-reveal key={member.name}>
                <div className="team-avatar">
                  <span>{member.initial}</span>
                  {member.photo && (
                    <img
                      className="team-photo"
                      src={member.photo}
                      alt={member.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="team-card-body">
                  <h3>{member.name}</h3>
                  <p className="role">{member.role}<span>{member.detail}</span></p>
                  <p className="focus">{member.focus}</p>
                  <p className="team-bio">{member.bio}</p>
                </div>
                <div className="team-card-meta">
                  <span className="team-marker">{member.marker}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="trust-strip" data-reveal>
            <span>✓ Single point of contact</span>
            <span>✓ Enquiries reviewed before onboarding</span>
            <span>✓ Documentation handled in-house</span>
            <span>✓ Support through to closing</span>
          </div>
          <div className="team-cta" data-reveal>
            <a href="#contact" className="btn btn-primary">Speak With The Team <ArrowUpRight size={15} /></a>
          </div>
        </div>
      </section>


      <section id="contact">
        <div className="container">
          <div className="sec-head" data-reveal>
            <span className="eyebrow">Start With A Conversation</span>
            <h2>Tell us about your property.</h2>
            <p>Whether you want to list, understand value or plan the next steps, our team is ready to speak with you.</p>
          </div>
          <div className="contact-grid">
            <div data-reveal>
              <div className="contact-info">
                <Info icon={<Phone />} title="Call / WhatsApp"><a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a></Info>
                <Info icon={<Mail />} title="Email Us"><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></Info>
                <Info icon={<MapPin />} title="Head Office">{site.contact.address}</Info>
                              <Info icon={<Clock />} title="Working Hours">{site.contact.workingHours.weekday}<br />{site.contact.workingHours.sunday}</Info>
              </div>
              <div className="map-wrap">
                <iframe src={site.contact.mapEmbedUrl} title="LANDLOGY office location" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
            <div className="contact-form" data-reveal>
              <h3>Send us a message</h3>
              <p>Our team will get back to you within 24 hours.</p>
              <Form />
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <strong>LANDLOGY</strong>
              <small>PROPERTY SELLING SUPPORT</small>
              <p>A structured, research-led service for property owners who want to sell with confidence.</p>
            </div>
            <div className="foot-col">
              <h4>For Property Owners</h4>
              <a href="#contact">List Your Property</a>
              <a href="#services">Our Services</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#why-sell">Why LANDLOGY</a>
            </div>
            <div className="foot-col">
              <h4>Client Access</h4>
              <SpaLink to="/client-login">Client Login</SpaLink>
              <a href="#contact">Contact LANDLOGY</a>
            </div>
            <div className="foot-col">
              <h4>Connect</h4>
              <a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a>
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            </div>
          </div>
          <div className="foot-bottom">
            <p>© 2026 LANDLOGY. All rights reserved.</p>
            <p>Information provided is for general guidance only.</p>
          </div>
        </div>
      </footer>
      <a className="whatsapp-btn" href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`} target="_blank" aria-label="Chat on WhatsApp"><MessageCircle /></a>
      <div className="cursor-glow" />
    </main>
  );
}

export default SellerLandingPage;
