import React, { useEffect, useState } from 'react';
import { getCurrentRoute } from './app/routes';
import { PortalPreloader } from './components/loading/PortalPreloader';
import { ClientLoginPage } from './pages/auth/ClientLoginPage';
import { ClientPortalPage } from './pages/client/ClientPortalPage';
import { SellerLandingPage } from './pages/public/SellerLandingPage';
import './styles.css';

export default function App() {
  const [bootReady, setBootReady] = useState(false);
  const route = getCurrentRoute();

  useEffect(() => {
    const timer = window.setTimeout(() => setBootReady(true), 220);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <PortalPreloader active={!bootReady} />
      {(() => {
        switch (route) {
          case 'client-login':
            return <ClientLoginPage />;
          case 'client-portal':
            return <ClientPortalPage />;
          case 'public':
          default:
            return <SellerLandingPage />;
        }
      })()}
    </>
  );
}
