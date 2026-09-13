import React from 'react';
import { ProfileSkeleton } from '../../components/loading/PortalSkeletons';

export function ProfilePage({ user }) {
  const currentUser = user || {};

  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <>
      <div className="portal-welcome">
        <div>
          <span className="eyebrow">Profile</span>
          <h1>Your account</h1>
          <p>This section shows only safe, read-only account information returned by the backend.</p>
        </div>
      </div>

      <section className="portal-section">
        <div className="portal-mini-card">
          <div className="profile-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
            <div><dt>Name</dt><dd>{currentUser.name || '—'}</dd></div>
            <div><dt>Email</dt><dd>{currentUser.email || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{currentUser.phone || '—'}</dd></div>
            <div><dt>Role</dt><dd>{currentUser.role || 'seller'}</dd></div>
            <div><dt>Account status</dt><dd>{currentUser.status || currentUser.account_status || 'active'}</dd></div>
            <div><dt>Account reference</dt><dd>{currentUser.accountId || currentUser.account_id || currentUser.reference || '—'}</dd></div>
          </div>
        </div>
      </section>
    </>
  );
}
