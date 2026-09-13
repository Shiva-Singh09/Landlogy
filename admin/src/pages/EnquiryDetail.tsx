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
    if (!confirm(`Change enquiry status to "${newStatus}"?`)) return;

    setUpdating(true);
    setError('');
    setSuccessMsg('');
    try {
      await updateEnquiryStatus(id, newStatus);
      setSuccessMsg('Status updated successfully');
      await fetchEnquiry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="page-loading">Loading enquiry...</div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!enquiry) return <div className="page-error">Enquiry not found</div>;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate('/enquiries')} className="btn-secondary btn-sm">&larr; Back</button>
        <h2>Enquiry Details</h2>
      </div>

      {successMsg && <div className="success-message">{successMsg}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="detail-card">
        <div className="detail-section">
          <h3>Seller / Client Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Name</label>
              <span>{enquiry.name}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{enquiry.phone}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{enquiry.email || '-'}</span>
            </div>
            <div className="detail-item">
              <label>City</label>
              <span>{enquiry.city || '-'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Enquiry Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Intent</label>
              <span>{enquiry.intent || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Property Type</label>
              <span>{enquiry.property_type || '-'}</span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span className={`badge badge-${enquiry.status}`}>{enquiry.status}</span>
            </div>
            <div className="detail-item">
              <label>Submitted</label>
              <span>{new Date(enquiry.created_at).toLocaleString()}</span>
            </div>
          </div>
          {enquiry.message && (
            <div className="detail-item full-width">
              <label>Message</label>
              <p className="message-text">{enquiry.message}</p>
            </div>
          )}
        </div>

        <div className="detail-section">
          <h3>Update Status</h3>
          <div className="status-actions">
            <button onClick={() => handleStatusUpdate('new')} disabled={updating || enquiry.status === 'new'} className="btn-secondary btn-sm">Mark New</button>
            <button onClick={() => handleStatusUpdate('reviewed')} disabled={updating || enquiry.status === 'reviewed'} className="btn-secondary btn-sm">Mark Reviewed</button>
            <button onClick={() => handleStatusUpdate('converted')} disabled={updating || enquiry.status === 'converted'} className="btn-primary btn-sm">Mark Converted</button>
            <button onClick={() => handleStatusUpdate('rejected')} disabled={updating || enquiry.status === 'rejected'} className="btn-danger btn-sm">Reject</button>
          </div>
        </div>

        {enquiry.notes && (
          <div className="detail-section">
            <h3>Notes</h3>
            <p>{enquiry.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
