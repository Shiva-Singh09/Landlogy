import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, Search, ShieldCheck, X } from 'lucide-react';
import { SiteNav, SiteFooter } from '../../components/public/SiteChrome';
import { SpaLink } from '../../utils/bus';
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

export function ServicesPage() {
  const { site, error, load } = useSiteData();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

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

  const term = q.trim().toLowerCase();
  const rows = site.serviceCatalog.filter((s) =>
    (cat === 'all' || s.cat === cat) &&
    (!term || s.title.toLowerCase().includes(term) || s.desc.toLowerCase().includes(term)));

  const wa = `https://wa.me/${site.contact.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent(site.contact.whatsappMessage)}`;

  return (
    <main className="ll ll-svcpage">
           <SiteNav site={site} onHome={false} />

      <header className="ll-svchead">
        <div className="ll-wrap">
          <span className="ll-kicker">{site.brand.slogan}</span>
          <h1>All <em>{site.serviceCatalog.length} services</em></h1>
          <p>{site.brand.description}</p>
        </div>
      </header>

      <section className="ll-sec">
        <div className="ll-wrap">
          <div className="ll-exp">
            <aside className="ll-exp-rail">
              {site.serviceCategories.map((c) => {
                const n = c.key === 'all'
                  ? site.serviceCatalog.length
                  : site.serviceCatalog.filter((s) => s.cat === c.key).length;
                return (
                  <button type="button" key={c.key}
                    onClick={() => { setCat(c.key); setQ(''); }}
                    className={cat === c.key ? 'on' : ''}>
                    <span>{c.label}</span><b>{n}</b>
                  </button>
                );
              })}
              <div className="ll-exp-note">
                <ShieldCheck size={14} />
                <p>Regulated services are handled by qualified professionals in our network.</p>
              </div>
            </aside>

            <div className="ll-exp-main">
              <div className="ll-exp-search">
                <Search size={16} />
                <input type="search" value={q} placeholder="Search all services"
                  onChange={(e) => setQ(e.target.value)} aria-label="Search services" />
                {q && <button type="button" onClick={() => setQ('')} aria-label="Clear"><X size={14} /></button>}
              </div>

              {rows.length === 0 ? (
                <p className="ll-exp-none">
                  Nothing matches “{q.trim()}”.{' '}
                  <button type="button" onClick={() => { setQ(''); setCat('all'); }}>Show all {site.serviceCatalog.length}</button>
                </p>
              ) : (
                <>
                  <p className="ll-exp-count">{rows.length} of {site.serviceCatalog.length} services</p>
                  <div className="ll-exp-rows">
                    {rows.map((s) => (
                      <a className="ll-exp-row" href="/#enquire" key={s.n}>
                        <span className="ll-exp-n">{s.n}</span>
                        <span className="ll-exp-t">{s.title}</span>
                        <span className="ll-exp-d">{s.desc}</span>
                        <ArrowUpRight size={15} />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="ll-chainwrap">
            <span className="ll-kicker">{site.brand.tagline}</span>
            <div className="ll-chain">
              {site.ecosystem.map((node, i) => (
                <span className="ll-chain-n" key={node}>
                  <i>{String(i + 1).padStart(2, '0')}</i>{node}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ll-svccta">
        <div className="ll-wrap">
          <div>
            <span className="ll-kicker">Get started</span>
            <h2>Tell us what you are working with.</h2>
            <p>Land, property, an investment or a project — we will point it at the right part of the network.</p>
          </div>
          <div className="ll-svccta-a">
            <SpaLink to="/" className="ll-btn ll-btn-a">Make an enquiry <ArrowUpRight size={15} /></SpaLink>
            <a href={wa} target="_blank" rel="noreferrer" className="ll-btn ll-btn-c">
              <MessageCircle size={15} /> WhatsApp
            </a>
          </div>
        </div>
      </section>

            <SiteFooter site={site} onHome={false} />
    </main>
  );
}

export default ServicesPage;