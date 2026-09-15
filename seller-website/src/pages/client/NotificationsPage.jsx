import React from 'react';
import { EmptyState } from '../../components/client/EmptyState';
import { SpaLink } from '../../utils/bus';

export function NotificationsPage() {
  return (
    <EmptyState
      title="No notifications"
      description="There are currently no notifications available for this account. This section is intentionally empty until a real notifications service is added."
      icon="notifications"
      action={<SpaLink to="/client-portal" className="btn btn-primary">Back to dashboard</SpaLink>}
    />
  );
}
