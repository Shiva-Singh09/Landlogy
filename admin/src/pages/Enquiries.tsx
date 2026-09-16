import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiries } from '../api/enquiries';
import type { Enquiry } from '../api/enquiries';

const statusLabel: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  converted: 'Converted',
  rejected: 'Rejected',
};

const statusClass: Record<string, string> = {
  new: 'status-new',
  reviewed: 'status-reviewed',
  converted: 'status-converted',
  rejected: 'status-rejected',
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getEnquiries({ page, limit: 10, status: statusFilter || undefined, search: search || undefined });
        if (!active) return;
        setEnquiries(res.enquiries);
        setTotalPages(res.pagination.totalPages);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load enquiries');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchEnquiries();
  };

  return (
    <div className="enquiries-page">
      <header className="enquiries-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Enquiries</h1>
            <p>Manage and track customer enquiries</p>
          </div>
        </div>
      </header>

      <div className="enquiries-toolbar">
        <form onSubmit={handleSearch} className="enquiries-search">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        <div className="filter-wrapper">
          <Filter size={16} className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="status-filter"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <span>Loading enquiries...</span>
        </div>
      ) : enquiries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3>No enquiries found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>City</th>
                <th>Intent</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((enquiry) => (
                <tr key={enquiry.id}>
                           <td data-label="Name"><strong>{enquiry.name}</strong></td>
                  <td data-label="Contact">
                    <div>{enquiry.phone}</div>
                    {enquiry.email && <div className="text-muted">{enquiry.email}</div>}
                  </td>
                  <td data-label="City">{enquiry.city || '—'}</td>
                  <td data-label="Intent">{enquiry.intent?.replace(/_/g, ' ') || '—'}</td>
                  <td data-label="Status"><span className={`badge badge-${enquiry.status}`}>{enquiry.status.replace(/_/g, ' ')}</span></td>
                  <td data-label="Received">{new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td data-label="">
                    <Link to={`/enquiries/${enquiry.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td className="customer-cell">
                      <div className="customer-info">
                        <div className="customer-name">{enquiry.name}</div>
                        {enquiry.city && <div className="customer-city">{enquiry.city}</div>}
                      </div>
                    </td>
                    <td>
                      <span className="property-type">
                        {enquiry.property_type || enquiry.intent || '-'}
                      </span>
                    </td>
                    <td className="contact-cell">
                      <div className="contact-phone">{enquiry.phone}</div>
                      {enquiry.email && <div className="contact-email">{enquiry.email}</div>}
                    </td>
                    <td className="date-cell">{formatDate(enquiry.created_at)}</td>
                    <td>
                      <span className={`status-badge ${statusClass[enquiry.status] ?? 'status-new'}`}>
                        <span className="status-dot"></span>
                        {statusLabel[enquiry.status] ?? enquiry.status}
                      </span>
                    </td>
                    <td className="action-cell">
                      <Link to={`/enquiries/${enquiry.id}`} className="view-button">
                        <Eye size={16} />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
