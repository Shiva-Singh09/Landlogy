import React, { useState } from 'react';
import { getCurrentRoute } from './app/routes';
import { ClientLoginPage } from './pages/auth/ClientLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ClientPortalPage } from './pages/client/ClientPortalPage';
import { SellerLandingPage } from './pages/public/SellerLandingPage';
import { ServicesPage } from './pages/public/ServicesPage';
import './styles/tokens.css';
import './styles/portal.css';
import './styles/public.css';

// No artificial boot delay: each route renders immediately. The portal shell
// owns its own blocking bootstrap (brand loader) only while the initial
// auth/session check + first data load are genuinely in flight.
export default function App() {
  const [route, setRoute] = useState(() => getCurrentRoute());
  const [path, setPath] = useState(() => window.location.pathname);

  React.useEffect(() => {
    const syncRoute = () => { setRoute(getCurrentRoute()); setPath(window.location.pathname); };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  return (
    <>
      {(() => {
        if (path.replace(/\/+$/, '') === '/services') return <ServicesPage />;
        switch (route) {
          case 'client-login':
            return <ClientLoginPage />;
          case 'forgot-password':
            return <ForgotPasswordPage />;
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
