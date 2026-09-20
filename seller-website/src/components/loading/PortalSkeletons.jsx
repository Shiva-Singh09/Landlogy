import React from 'react';

export function PageSkeleton({ children, className = '', label = 'Loading…' }) {
  return (
    <div className={`portal-skeleton ${className}`} aria-busy="true">
      <span role="status" className="lp-sr-only">{label}</span>
      <div aria-hidden="true" style={{ display: 'grid', gap: 'inherit' }}>{children}</div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <PageSkeleton label="Loading your dashboard…">
      <div className="lp-bandline skeleton-card">
        <div style={{ display: 'flex', gap: 'var(--s5)' }}>
          <span className="skeleton-line short" style={{ width: 90 }} />
          <span className="skeleton-line short" style={{ width: 90 }} />
        </div>
      </div>
      <div className="lp-card skeleton-card">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" style={{ width: '45%' }} />
        <div className="lp-proglist">
          {[0, 1, 2].map((i) => (
            <div key={i} className="lp-prog" style={{ pointerEvents: 'none' }}>
              <div className="lp-prog-top">
                <span className="skeleton-thumb" style={{ minHeight: 48, width: 56 }} />
                <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                  <span className="skeleton-line medium" />
                  <span className="skeleton-line short" />
                </div>
                <span className="skeleton-line pill" />
              </div>
              <span className="skeleton-line bar" />
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  );
}

export function PropertyCardSkeleton({ count = 3 }) {
  return (
    <PageSkeleton label="Loading your properties…">
      <div className="lp-pgrid2">
        {Array.from({ length: count }).map((_, index) => (
          <article key={index} className="lp-pc skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="skeleton-thumb" style={{ borderRadius: 0, minHeight: 190 }} />
            <div className="lp-pc-body" style={{ display: 'grid', gap: 10 }}>
              <span className="skeleton-line short" />
              <span className="skeleton-line title" style={{ width: '80%' }} />
              <span className="skeleton-line medium" />
              <span className="skeleton-line bar" />
            </div>
          </article>
        ))}
      </div>
    </PageSkeleton>
  );
}

export function PropertyDetailsSkeleton() {
  return (
    <PageSkeleton label="Loading this property…">
      <div className="lp-dhead">
        <div className="lp-dhero-ph">
          <span className="skeleton-line short" />
          <span className="skeleton-line title" />
          <span className="skeleton-line medium" />
        </div>
        <div className="lp-dhero-meta">
          <span className="skeleton-line medium" />
          <span className="skeleton-line medium" />
        </div>
      </div>
      <div className="lp-dgrid">
        <div style={{ display: 'grid', gap: 'var(--s4)' }}>
          <div className="lp-card skeleton-card">
            <span className="skeleton-line short" />
            <div className="skeleton-thumb skeleton-gallery" />
          </div>
          <div className="lp-card skeleton-card">
            <span className="skeleton-line short" />
            <div className="skeleton-grid-2">
              <span className="skeleton-line medium" />
              <span className="skeleton-line medium" />
            </div>
          </div>
        </div>
        <div className="lp-card skeleton-card">
          <span className="skeleton-line short" />
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

export function StatusTimelineSkeleton() {
  return (
    <PageSkeleton label="Loading property status…">
      <div className="lp-card skeleton-card">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" style={{ width: '55%' }} />
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
    </PageSkeleton>
  );
}

export function ProfileSkeleton() {
  return (
    <PageSkeleton label="Loading your profile…">
      <div className="lp-grid">
        <div className="lp-card skeleton-card">
          <span className="skeleton-line short" />
          <div className="skeleton-grid-2">
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line medium" />
          </div>
        </div>
        <div className="lp-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line long" />
          <span className="skeleton-line medium" />
        </div>
      </div>
    </PageSkeleton>
  );
}

export function NotificationSkeleton({ rows = 4 }) {
  return (
    <PageSkeleton label="Loading notifications…">
      <div className="lp-card skeleton-card">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" style={{ width: '50%' }} />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} style={{ display: 'grid', gap: 8, padding: 'var(--s3) 0', borderTop: index ? '1px solid var(--line-2)' : 0 }}>
            <span className="skeleton-line medium" />
            <span className="skeleton-line long" />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}

export function NotificationPopupSkeleton() {
  return (
    <div aria-busy="true" style={{ display: 'grid', gap: 10, padding: 'var(--s3) var(--s4)' }}>
      <span role="status" className="lp-sr-only">Loading notifications…</span>
      <div aria-hidden="true" style={{ display: 'grid', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'grid', gap: 6 }}>
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsSkeleton() {
  return (
    <PageSkeleton label="Loading documents…">
      <div className="lp-grid">
        <div className="lp-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line title" style={{ width: '55%' }} />
          <span className="skeleton-line long" />
          <span className="skeleton-line medium" />
        </div>
        <div className="lp-card skeleton-card">
          <span className="skeleton-line short" />
          <span className="skeleton-line long" />
          <span className="skeleton-line long" />
        </div>
      </div>
    </PageSkeleton>
  );
}
