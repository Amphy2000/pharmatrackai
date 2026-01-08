// Centralized external functions URL configuration
// This allows easy management across environments (dev/staging/prod)

import { readExternalBackendConfig } from './externalBackendConfig';

/**
 * Gets the external Supabase functions URL.
 * Falls back to the hardcoded URL only if no runtime config is available.
 */
export function getExternalFunctionsUrl(): string {
  const cfg = readExternalBackendConfig();
  if (cfg?.url) {
    // Derive functions URL from the Supabase URL
    // e.g., https://xxx.supabase.co -> https://xxx.supabase.co/functions/v1
    return `${cfg.url}/functions/v1`;
  }
  // Fallback to hardcoded URL for backwards compatibility
  return 'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1';
}
