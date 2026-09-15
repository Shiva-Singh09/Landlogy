import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiries } from '../api/enquiries';
import type { Enquiry } from '../api/enquiries';
import { getProperties } from '../api/properties';
import type { Property } from '../api/properties';
import { useAuth } from '../context/AuthContext';

interface DashboardData {
  totalEnquiries: number;
  newEnquiries: number;
  totalProperties: number;
  underReview: number;
  approved: number;
  recentEnquiries: Enquiry[];
  recentProperties: Property[];
}

const EMPTY_DATA: DashboardData = {
  totalEnquiries: 0,
  newEnquiries: 0,
  totalProperties: 0,
  underReview: 0,
  approved: 0,
  recentEnquiries: [],
  recentProperties: [],
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPrice = (value: string | null) => {
  if (!value) return '—';
  const amount = Number(value);
  return isNaN(amount) ? '—' : `₹${amount.toLocaleString('en-IN')}`;
};

const formatStatus = (value: string) => value.replace(/_/g, ' ');

const buildDonutGradient = (segments: Array<{ value: number; color: string }>) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return '#e9edf3';
  let angle = 0;
  const stops = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const start = angle;
      angle += (segment.value / total) * 360;
      return `${segment.color} ${start}deg ${angle}deg`;
    });
  return `conic-gradient(${stops.join(', ')})`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        const [enquiryPage, newEnquiryCount, propertyPage, reviewCount, approvedCount] = await Promise.all([
          getEnquiries({ limit: 5 }),
          getEnquiries({ status: 'new', limit: 1 }),
          getProperties({ limit: 5 }),
          getProperties({ status: 'under_review', limit: 1 }),
          getProperties({ status: 'active', limit: 1 }),
        ]);
        if (!active) return;
        setData({
          totalEnquiries: enquiryPage.pagination.total,
          newEnquiries: newEnquiryCount.pagination.total,
          totalProperties: propertyPage.pagination.total,
          underReview: reviewCount.pagination.total,
          approved: approvedCount.pagination.total,
          recentEnquiries: enquiryPage.enquiries.slice(0, 5),
          recentProperties: propertyPage.properties.slice(0, 5),
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboard();
    return () => { active = false; };
  }, []);

  const others = Math.max(0, data.totalProperties - data.underReview - data.approved);
  const segments = [
    { label: 'Approved', value: data.approved, color: '#10b981' },
    { label: 'Under Review', value: data.underReview, color: '#c8922a' },
    { label: 'Other statuses', value: others, color: '#243247' },
  ];
  const kpis = [
    { label: 'Total Enquiries', value: data.totalEnquiries, foot: 'All time', tone: '' },
    { label: 'New Enquiries', value: data.newEnquiries, foot: 'Awaiting review', tone: 'is-gold' },
    { label: 'Total Properties', value: data.totalProperties, foot: 'All statuses', tone: '' },
    { label: 'Under Review', value: data.underReview, foot: 'Pending decision', tone: 'is-warning' },
    { label: 'Approved', value: data.approved, foot: 'Live listings', tone: 'is-success' },
  ];
  const nothingPending = data.newEnquiries === 0 && data.underReview === 0;

  if (loading) return <div className="page-loading">Loading dashboard…</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="page dash">
      <header className="dash-header dash-reveal">
        <div>
          <span className="dash-eyebrow">LANDLOGY · Advisory Control</span>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">
            Welcome back{user?.name ? `, ${user.name}` : ''}. You have {data.newEnquiries} new
            {data.newEnquiries === 1 ? ' enquiry' : ' enquiries'} and {data.underReview} propert
            {data.underReview === 1 ? 'y' : 'ies'} awaiting review.
          </p>
        </div>
        <span className="dash-date">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </header>

      <section className="dash-kpis">
        {kpis.map((kpi, index) => (
          <article key={kpi.label} className={`dash-kpi ${kpi.tone}`.trim()} style={{ animationDelay: `${index * 60}ms` }}>
            <span className="dash-kpi-label">{kpi.label}</span>
            <span className="dash-kpi-value">{kpi.value}</span>
            <span className="dash-kpi-foot">{kpi.foot}</span>
          </article>
        ))}
      </section>

      <section className="dash-split">
        <article className="dash-panel" style={{ animationDelay: '120ms' }}>
          <header className="dash-panel-head">
            <h2>Requires Attention</h2>
            <span className="dash-panel-note">Live</span>
          </header>
          <ul className="dash-attention">
            <li>
              <Link className="dash-attention-item" to="/enquiries">
                <span className="dash-attention-icon" aria-hidden="true">✉</span>
                <span className="dash-attention-body">
                  <strong>{data.newEnquiries} new {data.newEnquiries === 1 ? 'enquiry' : 'enquiries'}</strong>
                  <span>Review incoming seller and client enquiries</span>
                </span>
                <span className="dash-attention-cta">Review →</span>
              </Link>
            </li>
            <li>
              <Link className="dash-attention-item" to="/properties">
                <span className="dash-attention-icon" aria-hidden="true">◆</span>
                <span className="dash-attention-body">
                  <strong>{data.underReview} {data.underReview === 1 ? 'property' : 'properties'} under review</strong>
                  <span>Approve, hold or reject submitted listings</span>
                </span>
                <span className="dash-attention-cta">Review →</span>
              </Link>
            </li>
          </ul>
          {nothingPending && <p className="dash-clear">All caught up — nothing requires review right now.</p>}
        </article>

        <article className="dash-panel" style={{ animationDelay: '180ms' }}>
          <header className="dash-panel-head">
            <h2>Property Status</h2>
            <span className="dash-panel-note">{data.totalProperties} total</span>
          </header>
          <div className="dash-donut-wrap">
            <div
              className="dash-donut"
              style={{ background: buildDonutGradient(segments) }}
              role="img"
              aria-label={`Property status breakdown: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}`}
            >
              <div className="dash-donut-hole">
                <strong>{data.totalProperties}</strong>
                <span>Properties</span>
              </div>
            </div>
            <ul className="dash-legend">
              {segments.map((segment) => (
                <li key={segment.label}>
                  <span className="dash-dot" style={{ background: segment.color }} />
                  <span className="dash-legend-label">{segment.label}</span>
                  <span className="dash-legend-value">{segment.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="dash-panel" style={{ animationDelay: '240ms' }}>
        <header className="dash-panel-head">
          <h2>Recent Enquiries</h2>
          <Link className="dash-panel-link" to="/enquiries">View all →</Link>
        </header>
        {data.recentEnquiries.length === 0 ? (
          <p className="dash-empty">No enquiries have been received yet.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>City</th>
                  <th>Intent</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEnquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Name">
                      <Link className="dash-cell-link" to={`/enquiries/${enquiry.id}`}>{enquiry.name}</Link>
                    </td>
                    <td data-label="Contact">
                      <span className="dash-mono">{enquiry.phone}</span>
                      {enquiry.email && <span className="dash-muted">{enquiry.email}</span>}
                    </td>
                    <td data-label="City">{enquiry.city || '—'}</td>
                    <td data-label="Intent">{enquiry.intent ? formatStatus(enquiry.intent) : '—'}</td>
                    <td data-label="Status">
                      <span className={`dash-status is-${enquiry.status}`}>{formatStatus(enquiry.status)}</span>
                    </td>
                    <td data-label="Received" className="dash-muted">{formatDate(enquiry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dash-lower">
        <article className="dash-panel" style={{ animationDelay: '300ms' }}>
          <header className="dash-panel-head">
            <h2>Recent Properties</h2>
            <Link className="dash-panel-link" to="/properties">View all →</Link>
          </header>
          {data.recentProperties.length === 0 ? (
            <p className="dash-empty">No properties have been submitted yet.</p>
          ) : (
            <ul className="dash-props">
              {data.recentProperties.map((property) => (
                <li key={property.id}>
                  <Link className="dash-prop" to={`/properties/${property.id}`}>
                    <span className="dash-prop-main">
                      <strong>{property.title}</strong>
                      <span className="dash-muted">
                        {[property.city, property.state].filter(Boolean).join(', ') || 'Location not set'} · {formatPrice(property.asking_price)}
                      </span>
                    </span>
                    <span className={`dash-status is-${property.status}`}>{formatStatus(property.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="dash-panel" style={{ animationDelay: '360ms' }}>
          <header className="dash-panel-head">
            <h2>Quick Actions</h2>
          </header>
          <div className="dash-quick">
            <Link className="dash-quick-btn" to="/enquiries">
              <span className="dash-quick-title">Review Enquiries</span>
              <span className="dash-quick-note">{data.newEnquiries} new · {data.totalEnquiries} total</span>
            </Link>
            <Link className="dash-quick-btn" to="/properties">
              <span className="dash-quick-title">Review Properties</span>
              <span className="dash-quick-note">{data.underReview} under review · {data.totalProperties} total</span>
            </Link>
            <Link className="dash-quick-btn is-primary" to="/properties/new">
              <span className="dash-quick-title">Create Property</span>
              <span className="dash-quick-note">Add a new listing with images</span>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
