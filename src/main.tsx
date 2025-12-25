import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./hooks/useOfflineSync";
import { initSentry } from "./lib/sentry";

// Initialize Sentry error monitoring before anything else
initSentry();

// Register service worker for offline POS
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
