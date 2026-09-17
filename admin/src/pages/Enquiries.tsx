import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiries, Enquiry } from '../api/enquiries';

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchEnquiries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEnquiries({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setEnquiries(res.enquiries);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEnquiries();
  };

  const getClientInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'C';
  };

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>Seller & Client <span>Enquiries</span></h2>
          <p>Review customer inquiries, property valuation requests, and acquisition intents submitted online.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by client name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="new">New (Unreviewed)</option>
          <option value="reviewed">Reviewed</option>
          <option value="converted">Converted Deal</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="error-message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          <div style={{ marginBottom: '1rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
          </div>
          Retrieving enquiries...
        </div>
      ) : enquiries.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📬</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', color: 'var(--ink)' }}>No enquiries found</h3>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>No enquiries match your current filters.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Contact Info</th>
                <th>Location</th>
                <th>Intent</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry) => (
                <tr key={enquiry.id}>
                  <td>
                    <div className="table-client-cell">
                      <div className="client-avatar-mini">
                        {getClientInitials(enquiry.name)}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--ink)' }}>{enquiry.name}</strong>
                        {enquiry.property_type && (
                          <div className="text-muted">{enquiry.property_type}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {enquiry.phone}
                    </div>
                    {enquiry.email && (
                      <div className="text-muted">{enquiry.email}</div>
                    )}
                  </td>
                  <td>
                    <span>{enquiry.city || '-'}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {enquiry.intent || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${enquiry.status}`}>
                      {enquiry.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-muted">
                      {new Date(enquiry.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/enquiries/${enquiry.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <span>Review</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            &larr; Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
