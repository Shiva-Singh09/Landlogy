import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Enquiry, getEnquiry, updateEnquiryStatus } from '../api/enquiries';

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

function RejectionModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  value,
  onChange,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  value: string;
  onChange: (value: string) => void;
  error: string;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div className="rejection-backdrop" onMouseDown={() => !loading && onClose()}>
      <div
        className="rejection-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-enquiry-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rejection-modal-header">
          <h3 id="reject-enquiry-title">Reject Enquiry</h3>
        </div>

        <p className="rejection-modal-copy">
          Please provide a reason for rejecting this enquiry.
        </p>

        <label className="field-label">Rejection Reason / Remark</label>
        <textarea
          className="rejection-textarea"
          rows={5}
          placeholder="Enter rejection reason..."
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
        />

        {error && <div className="field-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Rejecting...' : 'Reject Enquiry'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionRemark, setRejectionRemark] = useState('');
  const [rejectionError, setRejectionError] = useState('');
  const [rejectionSubmitting, setRejectionSubmitting] = useState(false);

  const fetchEnquiry = async () => {
    if (!id) return;

    setLoading(true);
    setError('');

    try {
      const response = await getEnquiry(id);
      setEnquiry(response.enquiry);
      if (response.enquiry.rejection_remark) {
        setRejectionRemark(response.enquiry.rejection_remark);
      }
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
    setUpdating(true);
    setError('');
    setSuccessMsg('');

    try {
      await updateEnquiryStatus(id, newStatus);
      setSuccessMsg(`Status updated to ${statusLabel[newStatus] ?? newStatus}.`);
      await fetchEnquiry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!id) return;

    const trimmedRemark = rejectionRemark.trim();
    if (!trimmedRemark) {
      setRejectionError('A rejection remark is required.');
      return;
    }

    setRejectionError('');
    setRejectionSubmitting(true);

    try {
      await updateEnquiryStatus(id, 'rejected', undefined, trimmedRemark);
      setRejectionModalOpen(false);
      setRejectionRemark('');
      setSuccessMsg('Enquiry rejected successfully.');
      await fetchEnquiry();
    } catch (err) {
      setRejectionError(err instanceof Error ? err.message : 'Unable to reject enquiry.');
    } finally {
      setRejectionSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading enquiry...</div>;
  if (error && !enquiry) return <div className="page-error">{error}</div>;
  if (!enquiry) return <div className="page-error">Enquiry not found.</div>;

  const currentStatus = enquiry.status;

  return (
    <div className="enquiry-detail-page">
      <header className="enquiry-detail-header">
        <button type="button" className="enquiry-back" onClick={() => navigate('/enquiries')}>
          ← Back to Enquiries
        </button>
        <div className="enquiry-detail-heading">
          <h1>Enquiry Details</h1>
        </div>
      </header>

      {successMsg && <div className="success-message">{successMsg}</div>}
      {error && <div className="error-message">{error}</div>}

      <section className="enquiry-detail-card">
        <div className="detail-summary-row">
          <div>
            <p className="eyebrow">Customer</p>
            <h2>{enquiry.name}</h2>
          </div>
          <span className={`status-badge ${statusClass[currentStatus] ?? 'status-new'}`}>
            {statusLabel[currentStatus] ?? currentStatus}
          </span>
        </div>
      </section>

      <div className="enquiry-detail-grid">
        <section className="enquiry-detail-card">
          <h3>Seller / Client Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>{enquiry.name || '-'}</span>
            </div>
            <div className="info-item">
              <label>Phone</label>
              <span>{enquiry.phone || '-'}</span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{enquiry.email || '-'}</span>
            </div>
            <div className="info-item">
              <label>City</label>
              <span>{enquiry.city || '-'}</span>
            </div>
          </div>
        </section>

        <section className="enquiry-detail-card">
          <h3>Enquiry Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Intent</label>
              <span>{enquiry.intent || '-'}</span>
            </div>
            <div className="info-item">
              <label>Property Type</label>
              <span>{enquiry.property_type || '-'}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span>{statusLabel[currentStatus] ?? currentStatus}</span>
            </div>
            <div className="info-item">
              <label>Submitted</label>
              <span>{new Date(enquiry.created_at).toLocaleString('en-IN')}</span>
            </div>
            <div className="info-item full-width">
              <label>Message</label>
              <p className="message-text">{enquiry.message || '-'}</p>
            </div>
          </div>
        </section>
      </div>

      {currentStatus === 'rejected' && enquiry.rejection_remark && (
        <section className="enquiry-detail-card rejection-card">
          <h3>Rejection Reason / Remark</h3>
          <p className="rejection-text">{enquiry.rejection_remark}</p>
        </section>
      )}

      <section className="enquiry-detail-card status-panel">
        <h3>Update Status</h3>
        <div className="status-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={updating || currentStatus === 'new'}
            onClick={() => handleStatusUpdate('new')}
          >
            Mark New
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={updating || currentStatus === 'reviewed'}
            onClick={() => handleStatusUpdate('reviewed')}
          >
            Mark Reviewed
          </button>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={updating || currentStatus === 'converted'}
            onClick={() => handleStatusUpdate('converted')}
          >
            Mark Converted
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            disabled={updating || rejectionSubmitting || currentStatus === 'rejected'}
            onClick={() => {
              setRejectionError('');
              setRejectionRemark(enquiry.rejection_remark ?? '');
              setRejectionModalOpen(true);
            }}
          >
            Reject
          </button>
        </div>
      </section>

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRejectionError('');
          setRejectionRemark(enquiry.rejection_remark ?? '');
        }}
        onConfirm={handleRejectSubmit}
        loading={rejectionSubmitting}
        value={rejectionRemark}
        onChange={setRejectionRemark}
        error={rejectionError}
      />
    </div>
  );
}
