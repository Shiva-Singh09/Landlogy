import React, { useState } from 'react';
import { getCurrentRoute } from './app/routes';
import { ClientLoginPage } from './pages/auth/ClientLoginPage';
import { ClientPortalPage } from './pages/client/ClientPortalPage';
import { SellerLandingPage } from './pages/public/SellerLandingPage';
import './styles/tokens.css';
import './styles/portal.css';
import './styles/public.css';

// No artificial boot delay: each route renders immediately. The portal shell
// owns its own blocking bootstrap (brand loader) only while the initial
// auth/session check + first data load are genuinely in flight.
export default function App() {
  const [route, setRoute] = useState(() => getCurrentRoute());

  React.useEffect(() => {
    const syncRoute = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  return (
    <>
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
