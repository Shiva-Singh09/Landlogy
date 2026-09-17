import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEnquiry, updateEnquiryStatus, Enquiry } from '../api/enquiries';

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchEnquiry = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await getEnquiry(id);
      setEnquiry(res.enquiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enquiry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiry();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    if (!window.confirm(`Update enquiry status to "${newStatus}"?`)) return;

    setUpdating(true);
    setError('');
    setSuccessMsg('');
    try {
      await updateEnquiryStatus(id, newStatus);
      setSuccessMsg(`Enquiry updated to "${newStatus}" successfully.`);
      await fetchEnquiry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div style={{ marginBottom: '1rem' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
        </div>
        Loading enquiry record...
      </div>
    );
  }

  if (error && !enquiry) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button onClick={() => navigate('/enquiries')} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          &larr; Back to Enquiries
        </button>
      </div>
    );
  }

  if (!enquiry) {
    return <div className="page-error">Enquiry record not found.</div>;
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/enquiries')}
            className="btn btn-secondary btn-sm"
            style={{ marginBottom: '0.75rem', gap: 6 }}
          >
            &larr; Back to Enquiries
          </button>
          <h2>{enquiry.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <span className={`badge badge-${enquiry.status}`}>
              {enquiry.status}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
              Received on {new Date(enquiry.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="header-actions">
          {enquiry.phone && (
            <a
              href={`tel:${enquiry.phone}`}
              className="btn btn-secondary btn-sm"
              title="Call Lead"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>Call Client</span>
            </a>
          )}
          {enquiry.email && (
            <a
              href={`mailto:${enquiry.email}`}
              className="btn btn-primary btn-sm"
              title="Email Lead"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Send Email</span>
            </a>
          )}
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="success-message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* Main Card */}
      <div className="detail-card">
        {/* Client Contact Profile */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Client Contact Profile
          </h3>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Full Name</label>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{enquiry.name}</span>
            </div>

            <div className="detail-item">
              <label>Phone Number</label>
              <span>{enquiry.phone}</span>
            </div>

            <div className="detail-item">
              <label>Email Address</label>
              <span>{enquiry.email || '-'}</span>
            </div>

            <div className="detail-item">
              <label>City / Location</label>
              <span>{enquiry.city || '-'}</span>
            </div>
          </div>
        </div>

        {/* Requirements & Intent */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Requirement Details
          </h3>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Client Intent</label>
              <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--indigo)' }}>
                {enquiry.intent || '-'}
              </span>
            </div>

            <div className="detail-item">
              <label>Target Property Type</label>
              <span>{enquiry.property_type || '-'}</span>
            </div>

            <div className="detail-item">
              <label>Processing State</label>
              <div>
                <span className={`badge badge-${enquiry.status}`}>{enquiry.status}</span>
              </div>
            </div>

            <div className="detail-item">
              <label>Submission Timestamp</label>
              <span>{new Date(enquiry.created_at).toLocaleString()}</span>
            </div>

            {enquiry.message && (
              <div className="detail-item full-width">
                <label>Client Inquiry Message</label>
                <div className="message-text" style={{ marginTop: '0.35rem' }}>
                  {enquiry.message}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div className="detail-section">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            Enquiry Disposition & Workflow
          </h3>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>
            Update the status as you follow up with this prospect.
          </p>

          <div className="status-actions">
            <button
              onClick={() => handleStatusUpdate('new')}
              disabled={updating || enquiry.status === 'new'}
              className="btn btn-secondary btn-sm"
            >
              Reset to New
            </button>
            <button
              onClick={() => handleStatusUpdate('reviewed')}
              disabled={updating || enquiry.status === 'reviewed'}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--amber)', color: '#b37400' }}
            >
              Mark Reviewed
            </button>
            <button
              onClick={() => handleStatusUpdate('converted')}
              disabled={updating || enquiry.status === 'converted'}
              className="btn btn-primary btn-sm"
            >
              ✓ Converted Deal
            </button>
            <button
              onClick={() => handleStatusUpdate('rejected')}
              disabled={updating || enquiry.status === 'rejected'}
              className="btn btn-danger btn-sm"
            >
              Reject / Archive
            </button>
          </div>
        </div>

        {/* Notes */}
        {enquiry.notes && (
          <div className="detail-section">
            <h3>Staff Follow-up Notes</h3>
            <div className="message-text">{enquiry.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
