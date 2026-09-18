import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bell, Check, ChevronRight, CircleHelp, Download, Eye, EyeOff, FileText, KeyRound, LayoutDashboard, LogOut, Menu, X, Phone, Mail, MapPin, Clock, MessageCircle, Search, ShieldCheck, TrendingUp, Building2, Home, Landmark, Users, Scale, Send, UserRound } from 'lucide-react';
import logo from '../../assets/Logo.png';
import heroVisual from '../../assets/Hero1.png';
import heroVisualSecondary from '../../assets/Hero.png';
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
// function useMotionVars() {
//   useEffect(() => {
//     const root = document.documentElement;
//     const fine = matchMedia('(pointer:fine)').matches;
//     const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
//     let frame = 0, mx = 0, my = 0, px = 0, py = 0;
//     const apply = () => {
//       frame = 0;
//       root.style.setProperty('--mx', mx.toFixed(3));
//       root.style.setProperty('--my', my.toFixed(3));
//       root.style.setProperty('--mxpx', px + 'px');
//       root.style.setProperty('--mypx', py + 'px');
//     };
//     const onMove = (e) => {
//       mx = (e.clientX / innerWidth) * 2 - 1;
//       my = (e.clientY / innerHeight) * 2 - 1;
//       px = e.clientX; py = e.clientY;
//       const card = e.target.closest?.('[data-spot]');
//       if (card) {
//         const b = card.getBoundingClientRect();
//         card.style.setProperty('--cx', ((e.clientX - b.left) / b.width) * 100 + '%');
//         card.style.setProperty('--cy', ((e.clientY - b.top) / b.height) * 100 + '%');
//       }
//       if (!frame) frame = requestAnimationFrame(apply);
//     };
//     const onScroll = () => {
//       const y = scrollY;
//       const max = document.documentElement.scrollHeight - innerHeight;
//       root.style.setProperty('--sy', y + 'px');
//       root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : '0');
//       document.body.classList.toggle('is-scrolled', y > 24);
//     };
//     if (fine && !still) addEventListener('mousemove', onMove, { passive: true });
//     addEventListener('scroll', onScroll, { passive: true });
//     onScroll();
//     return () => {
//       removeEventListener('mousemove', onMove);
//       removeEventListener('scroll', onScroll);
//       if (frame) cancelAnimationFrame(frame);
//     };
//   }, []);
// }

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

function FeedbackForm() {
  const [rating, setRating] = useState('Exceptional');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.rating = rating;
    data.formType = 'advisory-feedback';
    try {
      const response = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Submission failed');
      setStatus('success');
      form.reset();
      setRating('Exceptional');
    } catch (error) {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="feedback-form" onSubmit={submit}>
      <div className="feedback-rating-row">
        {['Exceptional', 'Rigorous', 'Satisfactory'].map((option) => (
          <label key={option} className={rating === option ? 'active' : ''}>
            <input type="radio" name="ratingChoice" checked={rating === option} onChange={() => setRating(option)} />
            {option}
          </label>
        ))}
      </div>
      <div className="field-row">
        <Field label="Stakeholder Category" name="category" select options={['Property Owner / Seller', 'Investor', 'Broker / Channel Partner', 'Developer']} />
        <Field label="Email Address" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      </div>
      <Field label="Observations & Recommendations" name="message" textarea placeholder="Tell us how we can improve..." required />
      {status === 'success' && <div className="form-status success" role="status">✓ Thank you — your note has been logged.</div>}
      {status === 'error' && <div className="form-status error" role="alert">✕ Something went wrong, please try again.</div>}
      <button type="submit" className="btn btn-primary submit-btn" disabled={busy}>{busy ? 'Sending...' : 'Submit Feedback'}</button>
    </form>
  );
}

// function Info({ icon, title, children }) {
//   return (
//     <div className="cinfo-block">
//       <div className="cinfo-icon">{icon}</div>
//       <div>
//         <strong>{title}</strong>
//         <p>{children}</p>
//       </div>
//     </div>
//   );
// }

// function SellerCapabilities({ site }) {
//   return (
//     <section id="capabilities" className="seller-section seller-section-soft">
//       <div className="container">
//         <div className="page-header" data-reveal>
//           <div>
//             <span className="eyebrow">Capabilities</span>
//             <h2>More than a listing.</h2>
//           </div>
//           <p>Specialist support for land, presentation and property decisions that need more context.</p>
//         </div>
//         <div className="seller-capability-grid">
//           <article className="ll-card ll-card-lift seller-capability-card" data-reveal>
//             <span className="seller-card-kicker">Land strategy</span>
//             <h3>Land Aggregation</h3>
//             <p>Bring fragmented land opportunities together through structured intelligence, verification and coordinated strategy.</p>
//             <div className="seller-capability-points">
//               <span><strong>01</strong>Identify connected opportunities</span>
//               <span><strong>02</strong>Organise property information</span>
//               <span><strong>03</strong>Shape the next step</span>
//             </div>
//             <a href="#contact" className="btn btn-primary">Discuss Land Strategy <ArrowUpRight size={15} /></a>
//           </article>
//           <article className="ll-card ll-card-lift seller-capability-card" data-reveal>
//             <span className="seller-card-kicker">Visual clarity</span>
//             <h3>3D Visualization with Context</h3>
//             <p>Present property, space and potential with the spatial clarity serious buyers need to make decisions.</p>
//             <div className="seller-capability-points">
//               <span><strong>01</strong>Clarify space and positioning</span>
//               <span><strong>02</strong>Highlight property potential</span>
//               <span><strong>03</strong>Support buyer understanding</span>
//             </div>
//             <a href="#contact" className="btn btn-secondary">Request Presentation <ArrowUpRight size={15} /></a>
//           </article>
//         </div>
//       </div>
//     </section>
//   );
// }

// function LegacySellerLandingPage() {
//   const [menu, setMenu] = useState(false);
//   const { site, error, load } = useSiteData();
//   useReveal(!!site);
//   useMotionVars();
//   useCounters(!!site);

//   useEffect(() => {
//     document.body.classList.toggle('menu-open', menu);
//     return () => document.body.classList.remove('menu-open');
//   }, [menu]);



//   if (!site) {
//     return (
//       <div className="seller-loading">
//         {error ? (
//           <>
//             <strong>LANDLOGY is temporarily unavailable.</strong>
//             <button className="btn btn-primary" onClick={load}>Retry</button>
//           </>
//         ) : (
//           'Loading LANDLOGY...'
//         )}
//       </div>
//     );
//   }

//   const services = site.sellerServices;
//   const steps = site.sellerSteps;
//   const trustItems = [
//     ['Pricing guidance', 'Research-led pricing that reflects market context and buyer demand.'],
//     ['Verification support', 'Relevant documents and ownership information organised early.'],
//     ['Professional presentation', 'A clearer property story with considered materials and positioning.'],
//     ['Buyer reach', 'Relevant buyer conversations without broad, untargeted noise.']
//   ];

//   return (
//     <main className="seller-landing">
//       <style>{`
//         .seller-hero-settle { animation: seller-hero-settle 760ms var(--ll-ease-out, cubic-bezier(.2,.8,.2,1)) both; }
//         .seller-hero-particles circle { animation: seller-particle-drift 760ms var(--ll-ease-out, cubic-bezier(.2,.8,.2,1)) both; transform-box: fill-box; transform-origin: center; }
//         .seller-hero-particles circle:nth-child(2n) { animation-delay: 70ms; }
//         .seller-hero-particles circle:nth-child(3n) { animation-delay: 130ms; }
//         @keyframes seller-hero-settle { from { opacity: 0; transform: translateY(-18px) scale(1.035); } to { opacity: 1; transform: translateY(0) scale(1); } }
//         @keyframes seller-particle-drift { from { opacity: .55; transform: translate(0, 0) scale(1); } to { opacity: 0; transform: translate(var(--particle-x), var(--particle-y)) scale(.35); } }
//         @media (prefers-reduced-motion: reduce) {
//           .seller-hero-settle { animation: seller-hero-fade 400ms ease-out both; }
//           .seller-hero-particles { display: none; }
//           @keyframes seller-hero-fade { from { opacity: 0; } to { opacity: 1; } }
//         }
//       `}</style>
//       <nav>
//         <div className="container nav-inner">
//           <a className="brand" href="#hero"><img src={logo} alt="LANDLOGY" /></a>
//           <div className="navlinks">
//             <a href="#how-it-works">How It Works</a>
//             <a href="#services">Our Services</a>
//             <a href="#why-sell">Why LANDLOGY</a>
               
//             <a href="#who-we-serve">Who We Serve</a>
//             <a href="#team">Our Team</a>
//             <a href="#contact">Contact</a>
//           </div>
//           <div className="nav-cta">
//             <a href={`tel:${site.contact.phoneRaw}`} className="btn btn-secondary"><Phone size={15} /> Call Us</a>
//             <SpaLink to="/client-login" className="btn btn-secondary">Client Login</SpaLink>
//             <a href="#contact" className="btn btn-primary">List Your Property <ArrowUpRight size={15} /></a>
//           </div>
//           <button className="ham" type="button" onClick={() => setMenu((value) => !value)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
//             {menu ? <X /> : <Menu />}
//           </button>
//         </div>
//         <span className="nav-progress" aria-hidden="true" />
//       </nav>

//       {menu && (
//         <div className="mobile-menu seller-mobile-menu">
//           <a href="#how-it-works" onClick={() => setMenu(false)}>How It Works</a>
//           <a href="#services" onClick={() => setMenu(false)}>Our Services</a>
//                  <a href="#why-sell" onClick={() => setMenu(false)}>Why LANDLOGY</a>
        
//           <a href="#who-we-serve" onClick={() => setMenu(false)}>Who We Serve</a>
//           <a href="#team" onClick={() => setMenu(false)}>Our Team</a>
//           <a href="#contact" onClick={() => setMenu(false)}>Contact</a>
//           <SpaLink className="btn btn-secondary" to="/client-login">Client Login</SpaLink>
//           <a className="btn btn-primary" href="#contact" onClick={() => setMenu(false)}>List Your Property <ArrowUpRight size={15} /></a>
//         </div>
//       )}

//       <header id="hero" className="seller-hero">
//         <div className="seller-hero-backdrop seller-hero-settle" />
//         <svg className="seller-hero-particles" viewBox="0 0 600 480" aria-hidden="true">
//           <circle cx="120" cy="260" r="2" style={{ '--particle-x': '-22px', '--particle-y': '-28px' }} />
//           <circle cx="185" cy="220" r="1.5" style={{ '--particle-x': '-16px', '--particle-y': '-34px' }} />
//           <circle cx="265" cy="315" r="2" style={{ '--particle-x': '24px', '--particle-y': '-20px' }} />
//           <circle cx="350" cy="190" r="1.5" style={{ '--particle-x': '28px', '--particle-y': '-30px' }} />
//           <circle cx="438" cy="278" r="2" style={{ '--particle-x': '30px', '--particle-y': '-18px' }} />
//           <circle cx="510" cy="235" r="1.5" style={{ '--particle-x': '18px', '--particle-y': '-26px' }} />
//         </svg>
//         <div className="container seller-hero-inner">
//           <div className="seller-hero-copy" data-reveal>
//   <span className="eyebrow">For property owners across India</span>
//   <h1>
//     <span className="reveal-line"><span>Sell your property</span></span>
//     <span className="reveal-line"><span className="accent">at the right price.</span></span>
//   </h1>
//   <p>{site.brand.tagline}</p>
//   <div className="hero-actions">
//     <a href="#contact" className="btn btn-primary">List Your Property <ArrowUpRight size={16} /></a>
//     <a href="#contact" className="btn btn-secondary">Get Free Valuation <ChevronRight size={16} /></a>
//   </div>
//   <div className="seller-hero-stats">
//     {site.heroStats.map((stat) => (
//       <div className="sh-stat" key={stat.label}>
//         <strong className="counter" data-target={stat.value}>0</strong>
//         <span>{stat.label}</span>
//       </div>
//     ))}
//   </div>
//   <div className="seller-trust-strip">
//     <span>Research-led approach</span>
//     <span>Verification support</span>
//     <span>Professional presentation</span>
//     <span>Guided selling process</span>
//   </div>
// </div>
//           <div className="hero-card seller-enquiry-card ll-card ll-card-lift" data-reveal>
//             <div className="hero-card-title">Tell Us About Your Property</div>
//             <p className="seller-card-sub">Start with a property-selling enquiry. LANDLOGY will review the information you share.</p>
//             <Form hero />
//           </div>
//         </div>
//       </header>

//       <section id="trust" className="seller-section seller-pain-section">
//         <div className="container">
//           <div className="page-header" data-reveal>
//             <div>
//               <span className="eyebrow">A better starting point</span>
//               <h2>Selling property should feel clearer.</h2>
//             </div>
//             <p>Research, verification, presentation and reach brought into one considered process.</p>
//           </div>
//           <div className="seller-pain-grid">
//             {trustItems.map(([title, text], index) => (
//              <article className="seller-pain-card ll-card ll-card-lift" data-reveal key={title}>
//                 <span>0{index + 1}</span>
//                 <h3>{title}</h3>
//                 <p>{text}</p>
//               </article>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section className="seller-section seller-trust-band">
//         <div className="container seller-trust-grid">
//           {trustItems.map(([title, text]) => (
//             <article className="ll-card ll-card-lift" data-reveal key={title}>
//               <strong>{title}</strong>
//               <span>{text}</span>
//             </article>
//           ))}
//         </div>
//       </section>

//       <section id="how-it-works" className="seller-section sec-slate">
//         <div className="container">
//           <div className="page-header seller-centered-head" data-reveal>
//             <div>
//               <span className="eyebrow">The selling process</span>
//               <h2>A clearer way to sell your property.</h2>
//             </div>
//             <p>Five high-level steps from your first enquiry through preparation and support.</p>
//           </div>
//           <div className="steps-stack">
//             <div className="steps-rail" aria-hidden="true"><span /></div>
//             <div className="steps-list">
//               {steps.map(([number, title, text], i) => (
//                 <article className="step-row ll-card ll-card-lift" data-reveal key={number} style={{ '--i': i }}>
//                   <span className="step-num">{number}</span>
//                   <div>
//                     <h3>{title}</h3>
//                     <p>{text}</p>
//                   </div>
//                 </article>
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       <section id="services" className="seller-section">
//         <div className="container">
//           <div className="page-header" data-reveal>
//             <div>
//               <span className="eyebrow">What LANDLOGY helps with</span>
//               <h2>Seller-focused support, end to end.</h2>
//             </div>
//             <p>Every service is designed around helping an owner make informed decisions.</p>
//           </div>
//           <div className="services-grid">
//             {services.map(([icon, title, text], index) => (
//              <article className="svc-card seller-service-card ll-card ll-card-lift" data-reveal key={title}>
//                 <div className="svc-icon">{icon}</div>
//                 <h3>{title}</h3>
//                 <p>{text}</p>
//                 <a href="#contact" className="btn btn-secondary">Discuss this with us <ArrowUpRight size={14} /></a>
//                 <span className="card-index">0{index + 1}</span>
//               </article>
//             ))}
//           </div>
//         </div>
//       </section>

//       <SellerCapabilities site={site} />

//       <section id="why-sell" className="sec-slate">
//         <div className="container seller-why-grid">
//           <div data-reveal>
//             <span className="eyebrow">Why Property Owners Choose LANDLOGY</span>
//             <h2>Selling with better clarity and support.</h2>
//             <p className="seller-why-intro">LANDLOGY is a service for owners who want a thoughtful selling process rather than simply placing a listing and waiting.</p>
//             {['Research before recommendation', 'Verification before promotion', 'Clearer property presentation', 'Human guidance when decisions matter'].map((title, index) => (
//               <div className="seller-why-row" key={title}>
//                 <span>{index + 1}</span>
//                 <div>
//                   <h3>{title}</h3>
//                   <p>We keep the focus on understanding your property, your objective and the next appropriate step.</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <div className="seller-why-panel" data-reveal>
//             <span className="eyebrow">A private client journey later</span>
//             <h3>Stay informed as your property progresses.</h3>
//             <p>After LANDLOGY reviews and accepts a client enquiry, approved clients may later receive secure access to a private portal for their own property information and status.</p>
//             <SpaLink to="/client-login" className="btn btn-white">Client Login <ArrowUpRight size={15} /></SpaLink>
//           </div>
//         </div>
//       </section>

      
      

//          <section id="who-we-serve" className="sec-navy">
//         <div className="container">
//           <div className="sec-head" data-reveal>
//             <span className="eyebrow">Who We Work With</span>
//             <h2 className="dark-title">Built around the people in every property decision.</h2>
//             <p>LANDLOGY brings owners, investors, developers and professionals into one structured process.</p>
//           </div>
//           <div className="network-grid" data-reveal-stagger>
//             {site.networks.map((n) => (
//               <article className="ncard" data-reveal data-spot key={n.title}>
//                 <div className="ncard-icon">{n.icon}</div>
//                 <h3>{n.title}</h3>
//                 <p>{n.desc}</p>
//                 <ArrowUpRight className="narrow" size={17} />
//               </article>
//             ))}
//           </div>
//         </div>
//       </section>

      
      

//          <section id="who-we-serve" className="sec-navy">
//         <div className="container">
//           <div className="sec-head" data-reveal>
//             <span className="eyebrow">Who We Work With</span>
//             <h2 className="dark-title">Built around the people in every property decision.</h2>
//             <p>LANDLOGY brings owners, investors, developers and professionals into one structured process.</p>
//           </div>
//           <div className="network-grid" data-reveal-stagger>
//             {site.networks.map((n) => (
//               <article className="ncard" data-reveal data-spot key={n.title}>
//                 <div className="ncard-icon">{n.icon}</div>
//                 <h3>{n.title}</h3>
//                 <p>{n.desc}</p>
//                 <ArrowUpRight className="narrow" size={17} />
//               </article>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section id="team">
//         <div className="container">
//           <div className="sec-head" data-reveal>
//             <span className="eyebrow">The LANDLOGY Team</span>
//             <h2>The people who handle your property.</h2>
//             <p>Every enquiry is reviewed by a small, accountable team — research, advisory, verification and strategy in one place.</p>
//           </div>
//           <div className="team-grid" data-reveal-stagger>
//             {site.team.map((member) => (
//               <article className="team-card" data-reveal key={member.name}>
//                 <div className="team-avatar">
//                   <span>{member.initial}</span>
//                   {member.photo && (
//                     <img
//                       className="team-photo"
//                       src={member.photo}
//                       alt={member.name}
//                       loading="lazy"
//                       onError={(e) => { e.currentTarget.style.display = 'none'; }}
//                     />
//                   )}
//                 </div>
//                 <div className="team-card-body">
//                   <h3>{member.name}</h3>
//                   <p className="role">{member.role}<span>{member.detail}</span></p>
//                   <p className="focus">{member.focus}</p>
//                   <p className="team-bio">{member.bio}</p>
//                 </div>
//                 <div className="team-card-meta">
//                   <span className="team-marker">{member.marker}</span>
//                 </div>
//               </article>
//             ))}
//           </div>
//           <div className="trust-strip" data-reveal>
//             <span>✓ Single point of contact</span>
//             <span>✓ Enquiries reviewed before onboarding</span>
//             <span>✓ Documentation handled in-house</span>
//             <span>✓ Support through to closing</span>
//           </div>
//           <div className="team-cta" data-reveal>
//             <a href="#contact" className="btn btn-primary">Speak With The Team <ArrowUpRight size={15} /></a>
//           </div>
//         </div>
//       </section>


//       <section id="contact">
//         <div className="container">
//           <div className="sec-head" data-reveal>
//             <span className="eyebrow">Start With A Conversation</span>
//             <h2>Tell us about your property.</h2>
//             <p>Whether you want to list, understand value or plan the next steps, our team is ready to speak with you.</p>
//           </div>
//           <div className="contact-grid">
//             <div data-reveal>
//               <div className="contact-info">
//                 <Info icon={<Phone />} title="Call / WhatsApp"><a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a></Info>
//                 <Info icon={<Mail />} title="Email Us"><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></Info>
//                 <Info icon={<MapPin />} title="Head Office">{site.contact.address}</Info>
//                               <Info icon={<Clock />} title="Working Hours">{site.contact.workingHours.weekday}<br />{site.contact.workingHours.sunday}</Info>
//               </div>
//               <div className="map-wrap">
//                 <iframe src={site.contact.mapEmbedUrl} title="LANDLOGY office location" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
//               </div>
//             </div>
//             <div className="contact-form" data-reveal>
//               <h3>Send us a message</h3>
//               <p>Our team will get back to you within 24 hours.</p>
//               <Form />
//             </div>
//           </div>
//         </div>
//       </section>

//       <footer>
//         <div className="container">
//           <div className="foot-grid">
//             <div className="foot-brand">
//               <strong>LANDLOGY</strong>
//               <small>PROPERTY SELLING SUPPORT</small>
//               <p>A structured, research-led service for property owners who want to sell with confidence.</p>
//             </div>
//             <div className="foot-col">
//               <h4>For Property Owners</h4>
//               <a href="#contact">List Your Property</a>
//               <a href="#services">Our Services</a>
//               <a href="#how-it-works">How It Works</a>
//               <a href="#why-sell">Why LANDLOGY</a>
//             </div>
//             <div className="foot-col">
//               <h4>Client Access</h4>
//               <SpaLink to="/client-login">Client Login</SpaLink>
//               <a href="#contact">Contact LANDLOGY</a>
//             </div>
//             <div className="foot-col">
//               <h4>Connect</h4>
//               <a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a>
//               <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
//             </div>
//           </div>
//           <div className="foot-bottom">
//             <p>© 2026 LANDLOGY. All rights reserved.</p>
//             <p>Information provided is for general guidance only.</p>
//           </div>
//         </div>
//       </footer>
//       <a className="whatsapp-btn" href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`} target="_blank" aria-label="Chat on WhatsApp"><MessageCircle /></a>
//       <div className="cursor-glow" />
//     </main>
//   );
// }

export function SellerLandingPage() {
  const [menu, setMenu] = useState(false);
  const [intakeTab, setIntakeTab] = useState('sell');
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
        {error ? <><strong>LANDLOGY is temporarily unavailable.</strong><button className="btn btn-primary" onClick={load}>Retry</button></> : 'Loading LANDLOGY...'}
      </div>
    );
  }

  const clusters = [
    { number: '01', code: 'SELL-EXEC', title: 'Property Execution', text: 'The practical work of understanding, positioning and moving a property toward the right buyer conversation.', names: ['Property Assessment', 'Pricing & Positioning', 'Professional Presentation'], footer: 'Seller advisory' },
    { number: '02', code: 'AUDIT-VERIFY', title: 'Research & Verification', text: 'The information layer that gives owners and buyers greater clarity before serious decisions are made.', names: ['Verification Support', 'Land Aggregation', 'Property Intelligence & Presentation'], footer: 'Context before promotion' },
    { number: '03', code: 'REACH-SUPPORT', title: 'Reach & Support', text: 'Relevant conversations and considered guidance through negotiation, handover and the next stage.', names: ['Relevant Buyer Reach', 'Negotiation & Closing Support', '3D Property Visualization'], footer: 'Guidance through the journey' }
  ];
  const getService = (name) => site.sellerServices.find((service) => service[1] === name);
  const corridors = ['Lucknow', 'Mumbai', 'Bangalore', 'Delhi NCR'];

  return (
    <main className="seller-landing editorial-landing">
      <nav className="editorial-nav">
        <div className="container nav-inner">
          <a className="editorial-brand" href="#hero" aria-label="LANDLOGY home"><img src={logo} alt="LANDLOGY" /><span><strong>LANDLOGY</strong><small>Architectural Advisory</small></span></a>
          <div className="navlinks"><a href="#how-it-works">How It Works</a><a href="#services">Our Services</a><a href="#why-sell">Why LANDLOGY</a><a href="#who-we-serve">Who We Serve</a><a href="#team">Our Team</a><a href="#contact">Contact</a></div>
          <div className="nav-cta"><a href={`tel:${site.contact.phoneRaw}`} className="nav-login"><Phone size={14} /> Call Us</a><SpaLink to="/client-login" className="nav-login">Client Login</SpaLink><a href="#contact" className="btn btn-primary">List Your Property <ArrowUpRight size={15} /></a></div>
             <button className="ham" type="button" onClick={() => setMenu((value) => !value)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>
        </div>
        <span className="nav-progress" aria-hidden="true" />
      </nav>

      {menu && <div className="mobile-menu seller-mobile-menu"><a href="#how-it-works" onClick={() => setMenu(false)}>How It Works</a><a href="#services" onClick={() => setMenu(false)}>Our Services</a><a href="#why-sell" onClick={() => setMenu(false)}>Why LANDLOGY</a><a href="#who-we-serve" onClick={() => setMenu(false)}>Who We Serve</a><a href="#team" onClick={() => setMenu(false)}>Our Team</a><a href="#contact" onClick={() => setMenu(false)}>Contact</a><a href={`tel:${site.contact.phoneRaw}`} className="client-login-link" onClick={() => setMenu(false)}>Call Us</a><SpaLink className="btn btn-secondary" to="/client-login" onClick={() => setMenu(false)}>Client Login</SpaLink><a className="btn btn-primary" href="#contact" onClick={() => setMenu(false)}>List Your Property <ArrowUpRight size={15} /></a></div>}

      <div className="editorial-corridor"><div className="container corridor-inner"><span><i /> Active corridors</span><strong>{corridors.join('  •  ')}</strong><a href={`tel:${site.contact.phoneRaw}`}><Phone size={14} /> Advisory desk: {site.contact.phone}</a></div></div>

      <header id="hero" className="editorial-hero">
        <div className="container editorial-hero-grid">
          <section className="editorial-hero-story ll-card" data-reveal>
            <div className="editorial-kicker"><Building2 size={15} /> Research-led property ecosystem</div>
            <h1>Real estate, understood as an <em>ecosystem.</em></h1>
            <p className="editorial-hero-lead">Sell at the right price, with the right context.</p>
            <p>{site.hero.sub}</p>
            <div className="editorial-hero-image"><img src={heroVisual} alt="Architectural property exterior" /><div className="editorial-image-overlay" /><div className="editorial-image-caption"><span>LANDLOGY / PROPERTY INTELLIGENCE</span><strong>Clearer positioning for serious property decisions.</strong></div></div>
            <div className="editorial-pillar-row">
              <div><Search size={16} /><span>Research</span><small>Location &amp; demand context</small></div>
              <div><ShieldCheck size={16} /><span>Verify</span><small>Title &amp; document review</small></div>
              <div><Users size={16} /><span>Connect</span><small>Vetted buyer network</small></div>
              <div><Scale size={16} /><span>Transact</span><small>Guided closing support</small></div>
            </div>
            <div className="editorial-trust-row">{site.numbersBand.items.slice(0, 3).map((item) => <div key={item.label}><Check size={16} /><span><strong>{item.label}</strong><small>{item.value}</small></span></div>)}</div>
          </section>

          <aside id="contact" className="editorial-intake ll-card" data-reveal><div className="editorial-intake-head"><div><span className="eyebrow">Direct partner channel</span><h2>Start a private enquiry</h2></div><img src={logo} alt="LANDLOGY monogram" /></div><div className="editorial-intake-tabs"><button type="button" className={intakeTab === 'sell' ? 'active' : ''} onClick={() => setIntakeTab('sell')}>Sell Property</button><button type="button" className={intakeTab === 'value' ? 'active' : ''} onClick={() => setIntakeTab('value')}>Get Valuation</button><button type="button" className={intakeTab === 'buy' ? 'active' : ''} onClick={() => setIntakeTab('buy')}>Enquire to Buy</button></div><p>{intakeTab === 'sell' ? 'Tell us what you are selling, where it is located and what you need to understand next.' : intakeTab === 'value' ? 'Request a research-backed valuation range before you decide to list.' : 'Tell us what you are looking for and our team will share matching opportunities.'}</p><Form hero /><div className="editorial-intake-foot"><span><ShieldCheck size={14} /> Discreet advisory review</span><span>24 hour response</span></div></aside>
        </div>
        <div className="container editorial-metrics">{site.heroStats.map((stat) => <div key={stat.label}><strong className="counter" data-target={stat.value}>0</strong><span>{stat.label}</span></div>)}<div><strong>Research</strong><span>Before recommendation</span></div><div><strong>Support</strong><span>Through to closing</span></div></div>
      </header>

      <section id="services" className="editorial-section editorial-dossier"><div className="container"><div className="editorial-section-head" data-reveal><div><span className="eyebrow">Architectural dossier</span><h2>One platform. Every property decision connected here.</h2></div><p>LANDLOGY brings research, verification, presentation and buyer reach into one calm, accountable process for property owners.</p></div><div className="editorial-cluster-grid" data-reveal-stagger>{clusters.map((cluster, i) => <article className="editorial-cluster ll-card ll-card-lift" data-reveal data-spot style={{ transitionDelay: `${Math.min(i,4)*80}ms` }} key={cluster.number}><div className="editorial-cluster-head"><span>{cluster.number}</span><small>{cluster.code}</small></div><h3>{cluster.title}</h3><p>{cluster.text}</p><div className="editorial-service-list">{cluster.names.map((name) => { const service = getService(name); return service ? <a href="#contact" key={name}><span><strong>{service[0]}</strong>{service[1]}</span><ArrowUpRight size={14} /></a> : null; })}</div><div className="card-foot"><span><ShieldCheck size={14} /> {cluster.footer}</span><span>LANDLOGY</span></div></article>)}</div></div></section>

      <section id="why-sell" className="editorial-section editorial-intelligence"><div className="container"><div className="editorial-intelligence-grid"><div className="editorial-copy" data-reveal><span className="eyebrow">Property intelligence</span><h2>Better decisions begin before the listing.</h2><p>Pricing, presentation and verification are not separate tasks. Together they create the context a serious buyer needs and the confidence an owner deserves.</p><div className="editorial-check-list"><span><Check size={15} /> Research before recommendation</span><span><Check size={15} /> Verification before promotion</span><span><Check size={15} /> Presentation shaped around value</span></div><a href="#contact" className="btn btn-primary">Discuss Your Property <ArrowUpRight size={15} /></a></div><div className="editorial-intelligence-visual ll-card" data-reveal><img src={heroVisualSecondary} alt="Architectural property presentation" /><div><span>LANDLOGY / INTELLIGENCE BRIEF</span><strong>Context makes value legible.</strong></div></div></div></div></section>

      <section id="who-we-serve" className="editorial-section editorial-stakeholders"><div className="container"><div className="editorial-section-head" data-reveal><div><span className="eyebrow">Who we serve</span><h2>A network built around every property decision.</h2></div><p>Owners, investors, developers, brokers and buyers all need a clearer, more trusted process.</p></div><div className="editorial-stakeholder-grid" data-reveal-stagger>{site.networks.map((network, index) => <article className="editorial-stakeholder ll-card ll-card-lift" data-reveal data-spot style={{ transitionDelay: `${Math.min(index,4)*80}ms` }} key={network.title}><div><span>0{index + 1}</span><small>{network.title}</small></div><h3>{network.title}</h3><p>{network.desc}</p><div className="card-foot"><ArrowUpRight size={15} /> Explore the network</div></article>)}</div></div></section>

      <section id="how-it-works" className="editorial-section editorial-journey"><div className="container"><div className="editorial-section-head" data-reveal><div><span className="eyebrow">A disciplined methodology</span><h2>From research to real estate.</h2></div><p>Five stages keep the seller informed from first conversation through marketing and closing support.</p></div><div className="editorial-journey-grid" data-reveal-stagger>{site.sellerSteps.map(([number, title, text], i) => <article className="editorial-journey-step ll-card ll-card-lift" data-reveal style={{ transitionDelay: `${Math.min(i,4)*80}ms` }} key={number}><span>{number}</span><small>SELLER JOURNEY</small><h3>{title}</h3><p>{text}</p><div className="card-foot">STAGE {number}</div></article>)}</div></div></section>

      <section id="team" className="editorial-section editorial-team"><div className="container"><div className="editorial-section-head" data-reveal><div><span className="eyebrow">Governance &amp; leadership</span><h2>The people behind the process.</h2></div><p>A small, accountable team combining strategy, research, advisory and verification.</p></div><div className="editorial-team-grid" data-reveal-stagger>{site.team.map((member, i) => <article className="editorial-team-card ll-card ll-card-lift" data-reveal data-spot style={{ transitionDelay: `${Math.min(i,4)*80}ms` }} key={member.name}><div className="team-avatar"><span>{member.initial}</span>{member.photo && <img className="team-photo" src={member.photo} alt={member.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}</div><h3>{member.name}</h3><span>{member.role} - {member.detail}</span><p>{member.bio}</p></article>)}</div></div></section>

      <section id="stories" className="editorial-section editorial-reviews"><div className="container"><div className="editorial-section-head" data-reveal><div><span className="eyebrow">Verified transaction reviews</span><h2>What clients and partners say.</h2></div><p>Feedback already held in LANDLOGY's site data, presented without invented claims.</p></div><div className="editorial-review-grid" data-reveal-stagger>{site.reviews.map((review, i) => <article className="editorial-review ll-card ll-card-lift" data-reveal data-spot style={{ transitionDelay: `${Math.min(i,4)*80}ms` }} key={review.name}><div className="editorial-stars">{'★'.repeat(review.rating)}</div><p>“{review.text}”</p><div className="card-foot"><strong>{review.name}</strong><span>{review.role}</span></div></article>)}</div></div></section>

  

      <section id="feedback" className="editorial-section" style={{ background: 'var(--ll-slate-soft)' }}>
        <div className="container">
          <div className="editorial-feedback ll-card" data-reveal>
            <div className="editorial-feedback-head">
              <div>
                <span className="eyebrow">Continuous governance</span>
                <h2>Help us refine the advisory experience.</h2>
              </div>
              <CircleHelp size={28} />
            </div>
            <FeedbackForm />
          </div>
        </div>
      </section>



      <section className="editorial-section editorial-contact"><div className="container editorial-contact-grid"><div className="editorial-contact-copy" data-reveal><span className="eyebrow">Executive advisory salon</span><h2>Build your next property decision on intelligence.</h2><p>{site.contact.address}</p><div><a href={`tel:${site.contact.phoneRaw}`} className="btn btn-primary"><Phone size={15} /> Connect with the advisory desk</a><a href={`mailto:${site.contact.email}`} className="btn btn-secondary"><Mail size={15} /> Email the desk</a></div></div><div className="editorial-map ll-card" data-reveal><iframe src={site.contact.mapEmbedUrl} title="LANDLOGY office location" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" /></div></div></section>

      <footer className="editorial-footer"><div className="container"><div className="foot-grid"><div className="foot-brand"><strong>LANDLOGY</strong><small>PRIVATE CLIENT ADVISORY</small><p>{site.brand.description}</p></div><div className="foot-col"><h4>Explore</h4><a href="#services">Advisory Method</a><a href="#intelligence">Market Intelligence</a><a href="#how-it-works">Seller Journey</a><a href="#team">Our Team</a></div><div className="foot-col"><h4>Client Access</h4><SpaLink to="/client-login">Client Login</SpaLink><a href="#contact">Private Valuation</a></div><div className="foot-col"><h4>Connect</h4><a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></div></div><div className="foot-bottom"><p>© 2026 LANDLOGY. All rights reserved.</p><p>{site.contact.workingHours.weekday}</p></div></div></footer>
      <a className="whatsapp-btn" href={`https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"><MessageCircle /></a>
      <div className="cursor-glow" />
    </main>
  );
}

export default SellerLandingPage;
