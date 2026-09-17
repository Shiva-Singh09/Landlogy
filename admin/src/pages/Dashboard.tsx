import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiries } from '../api/enquiries';
import { getProperties } from '../api/properties';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalEnquiries: number;
  newEnquiries: number;
  totalProperties: number;
  underReview: number;
  activeProperties: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEnquiries: 0,
    newEnquiries: 0,
    totalProperties: 0,
    underReview: 0,
    activeProperties: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [enquiriesRes, propertiesRes] = await Promise.all([
          getEnquiries({ limit: 1 }),
          getProperties({ limit: 1 }),
        ]);

        // Get counts for specific statuses
        const [newEnq, underReviewProp, activeProp] = await Promise.all([
          getEnquiries({ status: 'new', limit: 1 }),
          getProperties({ status: 'under_review', limit: 1 }),
          getProperties({ status: 'active', limit: 1 }),
        ]);

        setStats({
          totalEnquiries: enquiriesRes.pagination.total,
          newEnquiries: newEnq.pagination.total,
          totalProperties: propertiesRes.pagination.total,
          underReview: underReviewProp.pagination.total,
          activeProperties: activeProp.pagination.total,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <div style={{ marginBottom: '1rem' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
        </div>
        Loading dashboard metrics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Hero Welcome Banner */}
      <section className="dashboard-hero">
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="dashboard-hero-content">
          <div className="eyebrow">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block' }}></span>
            PORTAL OVERVIEW
          </div>
          <h2>
            Welcome back, <span>{user?.name || 'Administrator'}</span>
          </h2>
          <p>
            Monitor real-time client property inquiries, inspect listings awaiting editorial review, and oversee your property catalog with ease.
          </p>
          <div className="dashboard-hero-actions">
            <Link to="/enquiries" className="btn btn-primary">
              Review Enquiries
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            <Link to="/properties/new" className="btn btn-royal">
              + Add Property
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-header-text">
          <h2 style={{ fontSize: '1.75rem' }}>System Performance</h2>
          <p>High-level status counts across client submissions and property inventory.</p>
        </div>
      </div>

      <div className="stats-grid">
        {/* Total Enquiries */}
        <div className="stat-card stat-indigo">
          <div className="stat-header-row">
            <span className="stat-label">Total Enquiries</span>
            <div className="stat-icon stat-icon-indigo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.totalEnquiries.toLocaleString()}</div>
          <div className="stat-card-footer">
            <span className="text-muted">All incoming leads</span>
            <Link to="/enquiries" className="stat-link">
              View all &rarr;
            </Link>
          </div>
        </div>

        {/* New Enquiries */}
        <div className="stat-card stat-amber">
          <div className="stat-header-row">
            <span className="stat-label">New Enquiries</span>
            <div className="stat-icon stat-icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d99200' }}>
            {stats.newEnquiries.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            <span className="badge badge-new" style={{ padding: '2px 7px', fontSize: '0.68rem' }}>Requires Action</span>
            <Link to="/enquiries" className="stat-link">
              Inspect &rarr;
            </Link>
          </div>
        </div>

        {/* Total Properties */}
        <div className="stat-card stat-blue">
          <div className="stat-header-row">
            <span className="stat-label">Total Properties</span>
            <div className="stat-icon stat-icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.totalProperties.toLocaleString()}</div>
          <div className="stat-card-footer">
            <span className="text-muted">In database</span>
            <Link to="/properties" className="stat-link">
              Catalog &rarr;
            </Link>
          </div>
        </div>

        {/* Under Review */}
        <div className="stat-card stat-coral">
          <div className="stat-header-row">
            <span className="stat-label">Under Review</span>
            <div className="stat-icon stat-icon-coral">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--coral)' }}>
            {stats.underReview.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            <span className="text-muted">Awaiting approval</span>
            <Link to="/properties" className="stat-link">
              Review &rarr;
            </Link>
          </div>
        </div>

        {/* Active Properties */}
        <div className="stat-card stat-emerald">
          <div className="stat-header-row">
            <span className="stat-label">Active Listings</span>
            <div className="stat-icon stat-icon-emerald">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>
            {stats.activeProperties.toLocaleString()}
          </div>
          <div className="stat-card-footer">
            <span className="badge badge-active" style={{ padding: '2px 7px', fontSize: '0.68rem' }}>Live on portal</span>
            <Link to="/properties" className="stat-link">
              Manage &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="quick-grid">
        <div className="quick-card">
          <div>
            <div className="quick-card-header">
              <h3>Client Enquiries Hub</h3>
              <span className="badge badge-new">{stats.newEnquiries} Unresolved</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.25rem', lineHeight: '1.6' }}>
              Prospective buyers and sellers reach out via the portal contact forms. Review phone calls, purchase intents, and convert qualified leads.
            </p>
          </div>
          <Link to="/enquiries" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
            Open Enquiry Manager &rarr;
          </Link>
        </div>

        <div className="quick-card">
          <div>
            <div className="quick-card-header">
              <h3>Inventory & Catalog</h3>
              <span className="badge badge-active">{stats.activeProperties} Published</span>
            </div>
            <p className="text-muted" style={{ marginBottom: '1.25rem', lineHeight: '1.6' }}>
              Publish new land listings, configure pricing tiers in Lakhs or Crores, upload high-resolution photographs, and update listing lifecycle states.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/properties" className="btn btn-secondary btn-sm">
              View Listings
            </Link>
            <Link to="/properties/new" className="btn btn-primary btn-sm">
              + New Property
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
