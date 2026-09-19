import React, { useEffect, useState } from 'react';
import { getCurrentRoute } from './app/routes';
import { PortalPreloader } from './components/loading/PortalPreloader';
import { ClientLoginPage } from './pages/auth/ClientLoginPage';
import { ClientPortalPage } from './pages/client/ClientPortalPage';
import { SellerLandingPage } from './pages/public/SellerLandingPage';
import './styles.css';
import './styles/tokens.css';
import './styles/shared.css';
import './styles/portal.css';
import './styles/public.css';

export default function App() {
  const [bootReady, setBootReady] = useState(false);
  const [route, setRoute] = useState(() => getCurrentRoute());

  useEffect(() => {
    const timer = window.setTimeout(() => setBootReady(true), 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
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
