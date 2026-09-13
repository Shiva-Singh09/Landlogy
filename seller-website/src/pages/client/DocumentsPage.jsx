import React from 'react';
import { EmptyState } from '../../components/client/EmptyState';

export function DocumentsPage() {
  return (
    <EmptyState
      title="No documents yet"
      description="The current backend does not expose a document system for this client portal. Documents will appear here once that capability is enabled."
      icon="documents"
      action={<a href="/client-portal" className="btn btn-primary">Back to dashboard</a>}
    />
  );
}
