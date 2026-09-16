import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Search, X } from 'lucide-react';
import { getProperties } from '../api/properties';
import type { Property } from '../api/properties';

type StatusKey = '' | 'active' | 'under_review' | 'sold' | 'draft';
type StatusCount = Record<StatusKey, number>;

const PAGE_SIZE = 10;
const EMPTY_COUNTS: StatusCount = { '': 0, active: 0, under_review: 0, sold: 0, draft: 0 };
const statusTabs: Array<{ label: string; value: StatusKey }> = [
  { label: 'All', value: '' }, { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'under_review' }, { label: 'Sold', value: 'sold' }, { label: 'Draft', value: 'draft' },
];

const formatPrice = (price: string | null) => {
  if (!price) return '—';
  const amount = Number(price);
  if (Number.isNaN(amount)) return '—';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatStatus = (status: Property['status']) => status === 'under_review' ? 'Pending' : status.replace(/_/g, ' ');
const locationLabel = (property: Property) => [property.city, property.state].filter(Boolean).join(', ') || 'Location not set';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusKey>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [statusCounts, setStatusCounts] = useState<StatusCount>(EMPTY_COUNTS);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError('');
    const hasPriceRange = Boolean(minPrice || maxPrice);
    const sharedFilters = { search: search || undefined, limit: 1 };
    try {
      const [list, all, active, pending, sold, draft] = await Promise.all([
        getProperties({ page: hasPriceRange ? 1 : page, limit: PAGE_SIZE, status: statusFilter || undefined, search: search || undefined }),
        getProperties(sharedFilters),
        getProperties({ ...sharedFilters, status: 'active' }),
        getProperties({ ...sharedFilters, status: 'under_review' }),
        getProperties({ ...sharedFilters, status: 'sold' }),
        getProperties({ ...sharedFilters, status: 'draft' }),
      ]);
      if (hasPriceRange) {
        const remainingPages = Array.from({ length: Math.max(list.pagination.totalPages - 1, 0) }, (_, index) =>
          getProperties({ page: index + 2, limit: PAGE_SIZE, status: statusFilter || undefined, search: search || undefined })
        );
        const remaining = await Promise.all(remainingPages);
        const minimum = minPrice ? Number(minPrice) : 0;
        const maximum = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
        const priceMatches = [list, ...remaining]
          .flatMap((response) => response.properties)
          .filter((property) => {
            const price = Number(property.asking_price);
            return !Number.isNaN(price) && price >= minimum && price <= maximum;
          });
        setProperties(priceMatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
        setTotal(priceMatches.length);
        setTotalPages(Math.max(Math.ceil(priceMatches.length / PAGE_SIZE), 1));
      } else {
        setProperties(list.properties);
        setTotal(list.pagination.total);
        setTotalPages(Math.max(list.pagination.totalPages, 1));
      }
      setStatusCounts({ '': all.pagination.total, active: active.pagination.total, under_review: pending.pagination.total, sold: sold.pagination.total, draft: draft.pagination.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load properties.');
    } finally {
      setLoading(false);
    }
  }, [maxPrice, minPrice, page, search, statusFilter]);

  useEffect(() => { void loadProperties(); }, [loadProperties]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
    setMinPrice(minPriceInput.trim());
    setMaxPrice(maxPriceInput.trim());
  };

  const selectStatus = (status: StatusKey) => { setPage(1); setStatusFilter(status); };
  const clearFilters = () => { setPage(1); setStatusFilter(''); setSearchInput(''); setSearch(''); setMinPriceInput(''); setMaxPriceInput(''); setMinPrice(''); setMaxPrice(''); };
  const hasFilters = Boolean(statusFilter || search || minPrice || maxPrice);
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const propertyCell = (property: Property) => <Link to={`/properties/${property.id}`} className="properties-property"><span className="properties-thumbnail" aria-hidden="true"><Building2 size={18} /></span><span className="properties-property-copy"><strong>{property.title}</strong><small>{property.property_type_id || property.property_category_id || 'Property listing'}</small></span></Link>;

  return <section className="properties-page">
    <header className="properties-header"><div><h1>Properties</h1><p>Manage and monitor all properties in your portfolio.</p></div><Link to="/properties/new" className="properties-add-button"><Plus size={17} /> Add Property</Link></header>

    <nav className="properties-status-tabs" aria-label="Property status filters">{statusTabs.map((tab) => <button type="button" key={tab.label} className={statusFilter === tab.value ? 'is-active' : ''} onClick={() => selectStatus(tab.value)}>{tab.label}<span>{statusCounts[tab.value]}</span></button>)}</nav>

    <form className="properties-toolbar" onSubmit={applyFilters}>
      <label className="properties-search"><Search size={18} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search properties..." aria-label="Search properties" /></label>
      <button type="submit" className="properties-search-button">Search</button>
      <details className="properties-price-filter"><summary>Price Range</summary><div><label>Minimum price<input type="number" min="0" value={minPriceInput} onChange={(event) => setMinPriceInput(event.target.value)} placeholder="Min price" /></label><label>Maximum price<input type="number" min="0" value={maxPriceInput} onChange={(event) => setMaxPriceInput(event.target.value)} placeholder="Max price" /></label><button type="submit">Apply range</button></div></details>
      {hasFilters && <button type="button" className="properties-clear" onClick={clearFilters}><X size={15} /> Clear filters</button>}
    </form>

    {error ? <section className="properties-message properties-error"><h2>Unable to load properties</h2><p>We couldn't retrieve your property portfolio.</p><button type="button" onClick={() => void loadProperties()}>Retry</button></section> : loading ? <div className="properties-table-shell properties-skeleton" aria-label="Loading properties">{Array.from({ length: 6 }, (_, index) => <div className="properties-skeleton-row" key={index}><span /><span /><span /><span /><span /></div>)}</div> : properties.length === 0 ? <section className="properties-message"><Building2 size={28} /><h2>{hasFilters ? 'No properties match your current filters.' : 'No properties yet'}</h2><p>{hasFilters ? 'Try clearing a filter or broadening your search.' : 'Add your first property to start building your LANDLOGY portfolio.'}</p>{hasFilters ? <button type="button" onClick={clearFilters}>Clear filters</button> : <Link to="/properties/new">+ Add Property</Link>}</section> : <>
      <div className="properties-table-shell"><table className="properties-table"><thead><tr><th>Property</th><th>Client</th><th>Location</th><th>Price</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>{properties.map((property) => <tr key={property.id}><td>{propertyCell(property)}</td><td><span className="properties-owner" title={property.owner_id}>{property.owner_id ? `${property.owner_id.slice(0, 8)}…` : '—'}</span></td><td>{locationLabel(property)}</td><td className="properties-price">{formatPrice(property.asking_price)}</td><td><span className={`properties-status is-${property.status}`}>{formatStatus(property.status)}</span></td><td><Link className="properties-view" to={`/properties/${property.id}`}>View</Link></td></tr>)}</tbody></table></div>
      <div className="properties-mobile-list">{properties.map((property) => <article key={property.id} className="properties-mobile-item"><div className="properties-mobile-top">{propertyCell(property)}<span className={`properties-status is-${property.status}`}>{formatStatus(property.status)}</span></div><dl><div><dt>Location</dt><dd>{locationLabel(property)}</dd></div><div><dt>Price</dt><dd>{formatPrice(property.asking_price)}</dd></div><div><dt>Client</dt><dd className="properties-owner" title={property.owner_id}>{property.owner_id ? `${property.owner_id.slice(0, 8)}…` : '—'}</dd></div></dl><Link className="properties-view" to={`/properties/${property.id}`}>View property</Link></article>)}</div>
    </>}
    {!loading && !error && total > 0 && <footer className="properties-pagination"><p>Showing {firstItem}–{lastItem} of {total} properties</p>{totalPages > 1 && <div><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}</footer>}
  </section>;
}
