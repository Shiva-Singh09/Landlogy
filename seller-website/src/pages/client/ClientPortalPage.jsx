import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClientMe, fetchClientProperties } from '../../api/clientApi';
import { ClientLayout } from '../../components/client/ClientLayout';
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

export function ClientPortalPage() {
  const { client, token, isAuthenticated, logout, passwordSetupDone } = useClientAuth();
  const [me, setMe] = useState(client);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const propertiesLoadedRef = useRef(false);

  const loadPortalData = useCallback(async (forceProperties = false) => {
    if (!token) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const meResponse = await fetchClientMe(token);
        const resolvedProfile = meResponse && (meResponse.client || meResponse.user || meResponse.me)
          ? meResponse.client || meResponse.user || meResponse.me
          : meResponse;

        if (active && resolvedProfile) {
          setMe(resolvedProfile);
        }

        if (forceProperties || !propertiesLoadedRef.current) {
          const propertyResponse = await fetchClientProperties(token);
          const list = Array.isArray(propertyResponse.properties)
            ? propertyResponse.properties
            : Array.isArray(propertyResponse.data)
              ? propertyResponse.data
              : [];

          if (active) {
            setProperties(list);
            propertiesLoadedRef.current = true;
          }
        }
      } catch (err) {
        if (!active) return;
        if (err && (err.status === 401 || err.status === 403)) {
          logout();
          return;
        }
        setError(err && err.code === 'NETWORK'
          ? 'Unable to reach LANDLOGY services. Please check your connection and try again.'
          : 'Unable to load your portal information right now. Please try again later.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [token, logout]);

  useEffect(() => {
        if (!isAuthenticated) {
      navigate('/client-login');
      return;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!token) return;
    propertiesLoadedRef.current = false;
    const cancel = loadPortalData();
    return cancel;
  }, [token, loadPortalData]);

  const refreshProperties = useCallback(async () => {
    if (!token) return;
    try {
      const propertyResponse = await fetchClientProperties(token);
      const list = Array.isArray(propertyResponse.properties)
        ? propertyResponse.properties
        : Array.isArray(propertyResponse.data)
          ? propertyResponse.data
          : [];
      setProperties(list);
    } catch {}
  }, [token]);

  const currentUser = me || client || {};
  const route = getClientPortalSection();
  const propertyId = getClientPortalPropertyId();
  const needsSetup = Boolean(currentUser.force_password_change);

  if (!isAuthenticated) return null;

  if (needsSetup) {
    return (
      <PasswordSetupPage
        displayName={currentUser.name || 'LANDLOGY Client'}
        displayEmail={currentUser.email || ''}
        token={token}
        doLogout={logout}
        onComplete={() => {
          setMe((previous) => (previous ? { ...previous, force_password_change: false } : previous));
          passwordSetupDone();
          setLoading(true);
        }}
      />
    );
  }

  const currentPath = route === 'dashboard'
    ? '/client-portal'
    : route === 'properties'
      ? '/client-portal/properties'
      : route === 'add-property'
        ? '/client-portal/add-property'
        : route === 'status'
          ? '/client-portal/status'
          : route === 'documents'
            ? '/client-portal/documents'
            : route === 'notifications'
              ? '/client-portal/notifications'
              : route === 'profile'
                ? '/client-portal/profile'
                : route === 'property-detail' && propertyId
                  ? `/client-portal/properties/${propertyId}`
                  : '/client-portal/support';

  const renderPage = () => {
    switch (route) {
            case 'add-property':
        return <AddPropertyPage token={token} onBack={() => { navigate('/client-portal/properties'); }} onSuccess={() => { refreshProperties(); navigate('/client-portal/properties'); }} />;
            case 'properties':
        return <PropertiesPage properties={properties} loading={loading} error={error} onViewProperty={(id) => { navigate(`/client-portal/properties/${encodeURIComponent(id)}`); }} onAddProperty={() => { navigate('/client-portal/add-property'); }} />;
      case 'property-detail':
        return <PropertyDetailsPage propertyId={propertyId} token={token} onLogout={logout} fallbackProperties={properties} />;
      case 'status':
        return <PropertyStatusPage properties={properties} loading={loading} error={error} />;
      case 'documents':
        return <DocumentsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'profile':
        return <ProfilePage user={currentUser} />;
      case 'support':
        return <SupportPage />;
      case 'dashboard':
      default:
        return <DashboardPage user={currentUser} properties={properties} loading={loading} error={error} />;
    }
  };

  return (
    <ClientLayout user={currentUser} currentPath={currentPath} onLogout={logout}>
      {renderPage()}
    </ClientLayout>
  );
}

export default ClientPortalPage;
