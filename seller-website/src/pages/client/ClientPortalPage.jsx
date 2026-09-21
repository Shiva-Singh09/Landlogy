import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClientMe, fetchClientProperties } from '../../api/clientApi';
import { ClientLayout } from '../../components/client/ClientLayout';
import { PortalPreloader } from '../../components/loading/PortalPreloader';
import { useClientAuth } from '../../hooks/useClientAuth';
import { getClientPortalPropertyId, getClientPortalSection } from '../../app/routes';
import { navigate } from '../../utils/bus';
import { PasswordSetupPage } from '../auth/PasswordSetupPage';
import { DashboardPage } from './DashboardPage';
import { DocumentsPage } from './DocumentsPage';
import { NotificationsPage } from './NotificationsPage';
import { ProfilePage } from './ProfilePage';
import { PropertiesPage } from './PropertiesPage';
import { PropertyDetailsPage } from './PropertyDetailsPage';
import { PropertyStatusPage } from './PropertyStatusPage';
import { SupportPage } from './SupportPage';
import { AddPropertyPage } from './AddPropertyPage';

const PATHS = {
  dashboard: '/client-portal',
  properties: '/client-portal/properties',
  'add-property': '/client-portal/add-property',
  status: '/client-portal/status',
  documents: '/client-portal/documents',
  notifications: '/client-portal/notifications',
  profile: '/client-portal/profile',
  support: '/client-portal/support'
};

export function ClientPortalPage() {
  const { client, token, isAuthenticated, logout, passwordSetupDone } = useClientAuth();
  const [, setPathname] = useState(() => window.location.pathname);
  const [me, setMe] = useState(client);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // First blocking bootstrap only: the brand/full-screen loader may appear
  // here and nowhere else. Subsequent navigations stay inside the shell and
  // use skeleton screens per page.
  const [bootstrapping, setBootstrapping] = useState(true);

  /* held in a ref so it never re-triggers the load effect */
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/client-login');
  }, [isAuthenticated]);

  /* single load per token — this is what stopped the repeated /me queries */
  useEffect(() => {
    if (!token) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const meRes = await fetchClientMe(token);
        const profile = meRes?.client || meRes?.user || meRes?.me || meRes;
        if (alive && profile) setMe(profile);

        const propRes = await fetchClientProperties(token);
        const list = Array.isArray(propRes?.properties) ? propRes.properties
          : Array.isArray(propRes?.data) ? propRes.data : [];
        if (alive) setProperties(list);
      } catch (err) {
        if (!alive) return;
        if (err && (err.status === 401 || err.status === 403)) { logoutRef.current?.(); return; }
        setError(err && err.code === 'NETWORK'
          ? 'We could not reach LANDLOGY. Please check your connection and try again.'
          : 'We could not load your portal right now. Please try again in a moment.');
      } finally {
        if (alive) { setLoading(false); setBootstrapping(false); }
      }
    })();

    return () => { alive = false; };
  }, [token]);

  const refreshProperties = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchClientProperties(token);
      const list = Array.isArray(res?.properties) ? res.properties
        : Array.isArray(res?.data) ? res.data : [];
      setProperties(list);
    } catch {}
  }, [token]);

  const user = me || client || {};
  const route = getClientPortalSection();
  const propertyId = getClientPortalPropertyId();

  if (!isAuthenticated) return null;

  if (user.force_password_change) {
    return (
      <PasswordSetupPage
        displayName={user.name || 'Client'}
        displayEmail={user.email || ''}
        token={token}
        doLogout={logout}
        onComplete={() => {
          setMe((prev) => (prev ? { ...prev, force_password_change: false } : prev));
          passwordSetupDone();
        }}
      />
    );
  }

  const currentPath = route === 'property-detail' && propertyId
    ? `/client-portal/properties/${propertyId}`
    : PATHS[route] || PATHS.dashboard;

  // Blocking bootstrap: the entire shell cannot render until the first
  // auth/session + data load resolves. This is the ONLY full-screen loader.
  if (bootstrapping && loading) return <PortalPreloader active />;

  const page = (() => {
    switch (route) {
      case 'add-property':
        return <AddPropertyPage token={token}
          onBack={() => navigate('/client-portal/properties')}
          onSuccess={() => { refreshProperties(); navigate('/client-portal/properties'); }} />;
      case 'properties':
        return <PropertiesPage properties={properties} loading={loading} error={error}
          onViewProperty={(id) => navigate(`/client-portal/properties/${encodeURIComponent(id)}`)}
          onAddProperty={() => navigate('/client-portal/add-property')} />;
      case 'property-detail':
        return <PropertyDetailsPage propertyId={propertyId} token={token}
          onLogout={logout} fallbackProperties={properties} />;
      case 'status':
        return <PropertyStatusPage properties={properties} loading={loading} error={error} />;
      case 'documents':
        return <DocumentsPage properties={properties} />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage user={user} properties={properties} loading={loading} />;
      case 'support':
        return <SupportPage />;
      default:
        return <DashboardPage user={user} properties={properties} loading={loading} error={error} />;
    }
  })();

  return (
    <ClientLayout user={user} currentPath={currentPath} onLogout={logout}>
      {page}
    </ClientLayout>
  );
}

export default ClientPortalPage;