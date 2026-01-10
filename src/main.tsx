import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { registerServiceWorker } from "./hooks/useOfflineSync";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";

// Lazy load the main app for faster initial render
const App = lazy(() => import("./App.tsx"));

// Auto-clear caches on new deployments - helps non-tech users get updates automatically
const APP_VERSION = '2026.01.10.1';
const LAST_VERSION_KEY = 'pharmatrack_app_version';

const clearOldCaches = async () => {
  try {
    const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
    if (lastVersion !== APP_VERSION) {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // Update version
      localStorage.setItem(LAST_VERSION_KEY, APP_VERSION);
      // If service worker exists, tell it to clear caches too
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
      }
      // If not first visit, reload to get fresh content
      if (lastVersion) {
        console.log('[App] New version detected, reloading...');
        window.location.reload();
        return;
      }
    }
  } catch (e) {
    console.warn('Cache clear failed:', e);
  }
};

clearOldCaches();

// Register service worker for offline POS
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppLoadingScreen>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </AppLoadingScreen>
  </React.StrictMode>
);
