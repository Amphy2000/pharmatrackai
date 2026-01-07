// Main Supabase client wrapper
// Prefer external Supabase credentials (if provided), otherwise fall back to Lovable Cloud
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY;

const CLOUD_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CLOUD_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isExternalSupabaseConfigured = Boolean(EXTERNAL_SUPABASE_URL && EXTERNAL_SUPABASE_KEY);
const SUPABASE_URL = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_URL : CLOUD_SUPABASE_URL;
const SUPABASE_KEY = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_KEY : CLOUD_SUPABASE_KEY;

console.log('Supabase client using:', isExternalSupabaseConfigured ? 'External Supabase' : 'Lovable Cloud');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { isExternalSupabaseConfigured };
