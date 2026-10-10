import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import logo from '../../assets/Logo.png';
import { SpaLink } from '../../utils/bus';

export const NAV = [
  ['#services', 'What we do'],
  ['/services', 'All services'],
  ['#capabilities', 'Capabilities'],
  ['#process', 'How it works'],
  ['#contact', 'Contact']
];

/* on the services page, in-page anchors must point back home */
const resolve = (href, onHome) => (href.startsWith('#') && !onHome ? `/${href}` : href);

export function SiteNav({ site, spy = '', onHome = true }) {
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menu);
    return () => document.body.classList.remove('menu-open');
  }, [menu]);

  const close = () => setMenu(false);

  const link = ([href, label], isMobile) => {
    const to = resolve(href, onHome);
    if (href.startsWith('/')) {
      return (
        <SpaLink key={href} to={href} onClick={isMobile ? close : undefined}
          className={isMobile ? '' : 'll-ext'}>{label}</SpaLink>
      );
    }
    if (!onHome) {
      return <a key={href} href={to} onClick={isMobile ? close : undefined}>{label}</a>;
    }
    return (
      <a key={href} href={href} onClick={isMobile ? close : undefined}
        className={!isMobile && spy === href.slice(1) ? 'on' : ''}>{label}</a>
    );
  };

  return (
    <>
      <nav className="ll-nav">
        <div className="ll-wrap ll-nav-in">
          <SpaLink to="/" className="ll-logo" aria-label="LANDLOGY home">
            <img src={logo} alt="LANDLOGY" />
          </SpaLink>
          <div className="ll-links">{NAV.map((n) => link(n, false))}</div>
          <div className="ll-nav-cta">
            <SpaLink className="ll-quiet" to="/client-login">Client login</SpaLink>
            <a href={resolve('#enquire', onHome)} className="ll-btn ll-btn-a">List your property</a>
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
          {NAV.map((n) => link(n, true))}
          <a href={resolve('#team', onHome)} onClick={close}>Our team</a>
          <a href={`tel:${site.contact.phoneRaw}`} onClick={close}>Call us</a>
          <SpaLink to="/client-login" onClick={close}>Client login</SpaLink>
          <a className="ll-btn ll-btn-a" href={resolve('#enquire', onHome)} onClick={close}>
            List your property <ArrowUpRight size={15} />
          </a>
        </div>
      )}
    </>
  );
}

export function SiteFooter({ site, onHome = true }) {
  const h = (anchor) => (onHome ? anchor : `/${anchor}`);
  return (
    <footer className="ll-foot">
      <div className="ll-wrap">
        <div className="ll-foot-grid">
          <div className="ll-foot-b">
            <img src={logo} alt="LANDLOGY" />
            <p>{site.brand.tagline}</p>
          </div>
          <div>
            <h4>For owners</h4>
            <a href={h('#enquire')}>List your property</a>
            <a href={h('#services')}>What we do</a>
            <SpaLink to="/services">All services</SpaLink>
            <a href={h('#process')}>How it works</a>
          </div>
          <div>
            <h4>Access</h4>
            <SpaLink to="/client-login">Client login</SpaLink>
            <a href={h('#team')}>Our team</a>
            <a href={h('#contact')}>Contact us</a>
          </div>
          <div>
            <h4>Reach us</h4>
            <a href={`tel:${site.contact.phoneRaw}`}>{site.contact.phone}</a>
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </div>
        </div>
        <p className="ll-foot-note">{site.brand.disclaimer}</p>
        <div className="ll-foot-btm">
          <p>© 2026 LANDLOGY. All rights reserved.</p>
          <p>{site.contact.website} · {site.brand.reach}</p>
        </div>
      </div>
    </footer>
  );
}