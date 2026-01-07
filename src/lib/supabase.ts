// Main Supabase client wrapper
// ALWAYS prefer external Supabase credentials when available
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/**
 * IMPORTANT:
 * - In Vite, import.meta.env is baked at build time.
 * - Lovable “secrets” are not guaranteed to be exposed to the browser bundle.
 *
 * The Supabase anon key is public by design, so we can safely provide a fallback
 * to ensure auth works reliably.
 */
const DEFAULT_EXTERNAL_SUPABASE_URL = 'https://sdejkpweecasdzsixxbd.supabase.co';
const DEFAULT_EXTERNAL_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZWprcHdlZWNhc2R6c2l4eGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDUwOTIsImV4cCI6MjA4MjY4MTA5Mn0.kJ_SnWS1fF1BuTRU7_kzX8ZhihK5b1bARBLOfunIElA';

// External Supabase credentials (user's own Supabase project)
const EXTERNAL_SUPABASE_URL =
  (import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined) ??
  DEFAULT_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_KEY =
  (import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  DEFAULT_EXTERNAL_SUPABASE_KEY;

// Lovable Cloud credentials (fallback)
const CLOUD_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CLOUD_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const isExternalSupabaseConfigured = !!(
  EXTERNAL_SUPABASE_URL &&
  EXTERNAL_SUPABASE_URL.trim() !== '' &&
  EXTERNAL_SUPABASE_KEY &&
  EXTERNAL_SUPABASE_KEY.trim() !== ''
);

const SUPABASE_URL = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_URL : CLOUD_SUPABASE_URL;
const SUPABASE_KEY = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_KEY : CLOUD_SUPABASE_KEY;

console.log(
  '🔌 Supabase client using:',
  isExternalSupabaseConfigured ? `External (${SUPABASE_URL})` : 'Lovable Cloud'
);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { isExternalSupabaseConfigured };
