// Main Supabase client wrapper (External only)
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isExternalSupabaseConfigured = Boolean(
  EXTERNAL_SUPABASE_URL &&
    EXTERNAL_SUPABASE_URL.trim() !== '' &&
    EXTERNAL_SUPABASE_KEY &&
    EXTERNAL_SUPABASE_KEY.trim() !== ''
);

if (!isExternalSupabaseConfigured) {
  // Fail fast: no hidden fallback.
  throw new Error(
    [
      'External backend not configured.',
      'Missing VITE_EXTERNAL_SUPABASE_URL and/or VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY.',
      'Open your project Secrets and set both values, then hard refresh.'
    ].join(' ')
  );
}

console.log('🔌 Supabase client using External:', EXTERNAL_SUPABASE_URL);

export const supabase = createClient<Database>(EXTERNAL_SUPABASE_URL!, EXTERNAL_SUPABASE_KEY!, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

