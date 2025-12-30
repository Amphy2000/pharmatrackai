import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { registerServiceWorker } from "./hooks/useOfflineSync";
import { AppLoadingScreen } from "./components/common/AppLoadingScreen";

// Lazy load the main app for faster initial render
const App = lazy(() => import("./App.tsx"));

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
