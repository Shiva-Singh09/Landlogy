import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProperties, Property } from '../api/properties';

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProperties({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setProperties(res.properties);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProperties();
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    const num = parseFloat(price);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString()}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Properties</h2>
        <p>Manage and review property listings</p>
        <Link to="/properties/new" className="btn-primary btn-sm">Create property</Link>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by title or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="under_review">Under Review</option>
          <option value="active">Active</option>
          <option value="rejected">Rejected</option>
          <option value="inactive">Inactive</option>
          <option value="sold">Sold</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="page-loading">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="empty-state">No properties found</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Price</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td><strong>{property.title}</strong></td>
                  <td>
                    {property.city && <div>{property.city}</div>}
                    {property.state && <div className="text-muted">{property.state}</div>}
                    {!property.city && !property.state && '-'}
                  </td>
                  <td>{formatPrice(property.asking_price)}</td>
                  <td><span className={`badge badge-${property.status}`}>{property.status.replace('_', ' ')}</span></td>
                  <td>{new Date(property.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/properties/${property.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
