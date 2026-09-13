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

  return (
    <div className="page">
      <div className="page-header">
        <h2>Seller / Client Enquiries</h2>
        <p>Review and manage enquiries submitted through the Seller Website</p>
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
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
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="page-loading">Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <div className="empty-state">No enquiries found</div>
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
                  <td><strong>{enquiry.name}</strong></td>
                  <td>
                    <div>{enquiry.phone}</div>
                    {enquiry.email && <div className="text-muted">{enquiry.email}</div>}
                  </td>
                  <td>{enquiry.city || '-'}</td>
                  <td>{enquiry.intent || '-'}</td>
                  <td><span className={`badge badge-${enquiry.status}`}>{enquiry.status}</span></td>
                  <td>{new Date(enquiry.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/enquiries/${enquiry.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button
            className="btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
