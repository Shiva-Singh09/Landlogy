import React, { useMemo, useState } from 'react';
import { AlertCircle, Building2, LayoutGrid, List, MessageCircle, Plus, Search, X } from 'lucide-react';
import { PropertyCard, imageOf, refOf } from '../../components/client/PropertyCard';
import { EmptyState } from '../../components/client/EmptyState';
import { PropertyCardSkeleton } from '../../components/loading/PortalSkeletons';
import { formatDate, formatPriceINR, statusLabel, SUPPORT_CONTACT } from '../../config/constants';
import { SpaLink } from '../../utils/bus';

const WA = `https://wa.me/${SUPPORT_CONTACT.phoneRaw.replace(/\D/g, '')}?text=${encodeURIComponent('Hi LANDLOGY, I have a question about my properties.')}`;

const FILTERS = [
  ['all', 'All'],
  ['under_review', 'Under review'],
  ['active', 'Active'],
  ['draft', 'Draft'],
  ['sold', 'Sold'],
  ['rejected', 'Not approved']
];

export function PropertiesPage({ properties, loading, error, onViewProperty, onAddProperty }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('grid');

  const list = Array.isArray(properties) ? properties : [];

  const counts = useMemo(() => {
    const c = { all: list.length };
    list.forEach((p) => { if (p?.status) c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [list]);

  const totalValue = useMemo(
    () => list.reduce((sum, p) => sum + (Number(p?.asking_price ?? p?.price) || 0), 0),
    [list]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = list.filter((p) => {
      if (!p) return false;
      if (filter !== 'all' && p.status !== filter) return false;
      if (!q) return true;
      return [p.title, p.city, p.state, p.property_type, p.description, refOf(p.id)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });

    return [...out].sort((a, b) => {
      if (sort === 'price-high') return Number(b.asking_price || 0) - Number(a.asking_price || 0);
      if (sort === 'price-low') return Number(a.asking_price || 0) - Number(b.asking_price || 0);
      if (sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''));
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
  }, [list, query, filter, sort]);

  if (loading) return <PropertyCardSkeleton count={3} />;

  if (error) {
    return (
      <div className="lp-err" role="alert">
        <AlertCircle size={20} />
        <div><strong>We could not load your properties</strong><p>{error}</p></div>
      </div>
    );
  }

  /* ── nothing at all ── */
  if (list.length === 0) {
    return (
      <>
        <header className="lp-head">
          <span className="lp-k">Your portfolio</span>
          <h1>My <em>properties</em></h1>
          <p>Everything you list with LANDLOGY will live here.</p>
        </header>

        <section className="lp-card">
          <div className="lp-empty">
            <span className="lp-empty-i"><Building2 size={28} /></span>
            <h3>No properties yet</h3>
            <p>Add your first property and our team will review the details, work out a realistic price, and come back to you within two to three working days.</p>
            <div className="lp-empty-a">
              <button type="button" className="lp-btn lp-btn-a" onClick={onAddProperty}>
                <Plus size={15} /> Add your first property
              </button>
              <a href={WA} target="_blank" rel="noreferrer" className="lp-btn lp-btn-b">
                <MessageCircle size={15} /> Ask a question
              </a>
            </div>
          </div>
        </section>
      </>
    );
  }

  const filtering = query.trim() !== '' || filter !== 'all';

  return (
    <>
      <header className="lp-head">
        <div className="lp-head-row">
          <div>
            <span className="lp-k">Your portfolio</span>
            <h1>My <em>properties</em></h1>
            <p>
              {list.length} propert{list.length === 1 ? 'y' : 'ies'} with LANDLOGY
              {totalValue > 0 && <> · combined asking price {formatPriceINR(totalValue)}</>}
            </p>
          </div>
          <button type="button" className="lp-btn lp-btn-a" onClick={onAddProperty}>
            <Plus size={16} /> Add property
          </button>
        </div>
      </header>

      {/* toolbar */}
      <div className="lp-toolbar">
        <div className="lp-search">
          <Search size={16} />
          <input type="search" value={query} placeholder="Search by name, city, type or reference"
            onChange={(e) => setQuery(e.target.value)} aria-label="Search properties" />
          {query && (
            <button type="button" className="lp-search-x" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <select className="lp-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          <option value="recent">Recently updated</option>
          <option value="price-high">Price: high to low</option>
          <option value="price-low">Price: low to high</option>
          <option value="title">Name A–Z</option>
        </select>

        <div className="lp-viewtog" role="group" aria-label="View">
          <button type="button" onClick={() => setView('grid')} className={view === 'grid' ? 'on' : ''} aria-label="Grid view">
            <LayoutGrid size={15} />
          </button>
          <button type="button" onClick={() => setView('list')} className={view === 'list' ? 'on' : ''} aria-label="List view">
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="lp-chips">
        {FILTERS.map(([key, label]) => {
          const n = counts[key] || 0;
          if (key !== 'all' && n === 0) return null;
          return (
            <button type="button" key={key} onClick={() => setFilter(key)}
              className={`lp-chip ${filter === key ? 'on' : ''}`}>
              {label} <b>{n}</b>
            </button>
          );
        })}
        {filtering && (
          <button type="button" className="lp-chip lp-chip-x"
            onClick={() => { setQuery(''); setFilter('all'); }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {filtering && shown.length > 0 && (
        <p className="lp-resultline">
          Showing {shown.length} of {list.length}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon="properties"
          title="Nothing matches"
          description={query
            ? `No properties match "${query.trim()}"${filter !== 'all' ? ` in ${statusLabel(filter)}` : ''}. Try a different search or clear the filters.`
            : `You have no properties marked ${statusLabel(filter)} right now.`}
          action={
            <button type="button" className="lp-btn lp-btn-b" onClick={() => { setQuery(''); setFilter('all'); }}>
              Clear filters
            </button>
          }
        />
      ) : view === 'grid' ? (
        <section className="lp-pgrid2">
          {shown.map((p) => <PropertyCard key={p.id} property={p} onViewDetails={onViewProperty} />)}
        </section>
      ) : (
        <section className="lp-plist">
          {shown.map((p) => {
            const img = imageOf(p);
            const loc = [p.city, p.state].filter(Boolean).join(', ');
            return (
              <button type="button" key={p.id} className="lp-plist-row" onClick={() => onViewProperty(p.id)}>
                <span className="lp-plist-thumb">
                  {img ? <img src={img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <span className="lp-ph"><Building2 size={20} /></span>}
                </span>
                <span className="lp-plist-m">
                  <strong>{p.title || 'Property'}</strong>
                  <small>{loc || 'Location to be confirmed'} {refOf(p.id) && <>· {refOf(p.id)}</>}</small>
                </span>
                <span className={`lp-pill s-${p.status || 'draft'}`}><i />{statusLabel(p.status)}</span>
                <span className="lp-plist-p">{formatPriceINR(p.asking_price ?? p.price)}</span>
                <time>{formatDate(p.updated_at || p.updatedAt)}</time>
              </button>
            );
          })}
        </section>
      )}
    </>
  );
}

export default PropertiesPage;