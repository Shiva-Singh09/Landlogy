import { useState, useEffect } from 'react';
import { getEnquiries } from '../api/enquiries';
import { getProperties } from '../api/properties';

interface DashboardStats {
  totalEnquiries: number;
  newEnquiries: number;
  totalProperties: number;
  underReview: number;
  activeProperties: number;
}

export default function Dashboard() {
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

  if (loading) return <div className="page-loading">Loading dashboard...</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of Seller/Client enquiries and properties</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Enquiries</div>
          <div className="stat-value">{stats.totalEnquiries}</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-label">New Enquiries</div>
          <div className="stat-value">{stats.newEnquiries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Properties</div>
          <div className="stat-value">{stats.totalProperties}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Under Review</div>
          <div className="stat-value">{stats.underReview}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Active Properties</div>
          <div className="stat-value">{stats.activeProperties}</div>
        </div>
      </div>
    </div>
  );
}
