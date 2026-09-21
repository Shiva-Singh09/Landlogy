import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Non-blocking seller service-worker registration (does not gate the app).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw-push.js')
    .then(() => undefined)
    .catch(() => undefined);
}
