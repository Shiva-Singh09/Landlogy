import React from 'react';

export function PageSkeleton({ children, className = '' }) {
  return <div className={`portal-skeleton ${className}`}>{children}</div>;
}

export function DashboardSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
          <span className="skeleton-line medium" />
        </div>
        <span className="skeleton-line tiny" />
      </div>

      <div className="portal-overview-grid skeleton-grid">
        <div className="portal-mini-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line long" />
          <span className="skeleton-line bar" />
        </div>
        <div className="portal-mini-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line long" />
          <span className="skeleton-line long" />
        </div>
      </div>

      <div className="portal-lower-grid skeleton-grid">
        <div className="portal-profile skeleton-card">
          <span className="skeleton-line short" />
          <div className="skeleton-pair">
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
          </div>
        </div>
        <div className="portal-support skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line long" />
        </div>
      </div>
    </PageSkeleton>
  );
}

export function PropertyCardSkeleton({ count = 3 }) {
  return (
    <div className="portal-section" style={{ display: 'grid', gap: '18px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="owner-property-card skeleton-card property-skeleton-card">
          <div className="skeleton-thumb" />
          <div className="owner-property-info">
            <div className="property-title-row">
              <div style={{ width: '100%' }}>
                <span className="skeleton-line tiny" />
                <span className="skeleton-line title medium" />
                <span className="skeleton-line short" />
              </div>
              <span className="skeleton-line pill" />
            </div>
            <div className="property-facts skeleton-facts">
              <span className="skeleton-line short" />
              <span className="skeleton-line short" />
              <span className="skeleton-line short" />
              <span className="skeleton-line short" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PropertyDetailsSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
        <span className="skeleton-line medium pill-shell" />
      </div>

      <div className="portal-section">
        <div className="portal-mini-card skeleton-card skeleton-gallery" />
        <div className="portal-mini-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" />
          <div className="skeleton-grid-4">
            <span className="skeleton-line short" />
            <span className="skeleton-line short" />
            <span className="skeleton-line short" />
            <span className="skeleton-line short" />
          </div>
        </div>
        <div className="portal-mini-card skeleton-card">
          <span className="skeleton-line short" />
          <div className="skeleton-grid-2">
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}

export function StatusTimelineSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
      </div>

      <div className="portal-section">
        <div className="portal-mini-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line medium" />
        </div>

        <div className="portal-mini-card skeleton-card timeline-skeleton">
          <span className="skeleton-line short" />
          <div className="timeline-skeleton-row">
            <span className="skeleton-dot" />
            <span className="skeleton-line medium" />
          </div>
          <div className="timeline-skeleton-row">
            <span className="skeleton-dot" />
            <span className="skeleton-line medium" />
          </div>
          <div className="timeline-skeleton-row">
            <span className="skeleton-dot" />
            <span className="skeleton-line medium" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}

export function ProfileSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
      </div>

      <div className="portal-section">
        <div className="portal-mini-card skeleton-card">
          <div className="skeleton-grid-2">
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}

export function NotificationSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
      </div>
      <div className="portal-mini-card skeleton-card notification-skeleton" />
    </PageSkeleton>
  );
}

export function DocumentsSkeleton() {
  return (
    <PageSkeleton>
      <div className="portal-welcome skeleton-row">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
        </div>
      </div>
      <div className="portal-mini-card skeleton-card documents-skeleton" />
    </PageSkeleton>
  );
}
