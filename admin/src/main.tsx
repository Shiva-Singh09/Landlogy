import React from "react";
import ReactDOM from "react-dom/client";
import AOS from "aos";
import "aos/dist/aos.css";

import App from "./App";
import "./index.css";

AOS.init({
  duration: 650,
  easing: "ease-out-cubic",
  once: true,
  offset: 24,
  delay: 0,
  disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
});

// Single app-lifecycle PWA registration: same worker URL/scope as the Web Push
// flow in NotificationContext, so the browser reuses one registration/worker.
// Never blocks or crashes the app if registration is unavailable.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-notifications.js").catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);