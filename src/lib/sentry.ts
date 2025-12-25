import * as Sentry from '@sentry/react';

// Initialize Sentry for production error monitoring
// The DSN is a publishable key and safe to include in client-side code
export const initSentry = () => {
  // Only initialize in production or if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not configured, error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Additional integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException as Error;
      
      // Ignore network errors when offline (expected behavior)
      if (!navigator.onLine && error?.message?.includes('Failed to fetch')) {
        return null;
      }
      
      // Ignore ResizeObserver errors (browser quirk, not a real bug)
      if (error?.message?.includes('ResizeObserver')) {
        return null;
      }
      
      return event;
    },
  });
};

// Utility to manually capture errors
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, { extra: context });
};

// Utility to set user context
export const setUserContext = (userId: string, email?: string, pharmacyId?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    pharmacyId,
  } as Sentry.User);
};

// Utility to clear user context on logout
export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Export Sentry for direct access
export { Sentry };
