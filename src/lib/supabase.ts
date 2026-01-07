// Main Supabase client wrapper
// This uses the external Supabase if configured, otherwise falls back to Lovable Cloud
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Check for external Supabase credentials first
const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY;

// Fallback to Lovable Cloud credentials
const LOVABLE_CLOUD_URL = import.meta.env.VITE_SUPABASE_URL;
const LOVABLE_CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Determine which credentials to use
const isExternalConfigured = Boolean(EXTERNAL_SUPABASE_URL && EXTERNAL_SUPABASE_KEY);
const SUPABASE_URL = isExternalConfigured ? EXTERNAL_SUPABASE_URL : LOVABLE_CLOUD_URL;
const SUPABASE_KEY = isExternalConfigured ? EXTERNAL_SUPABASE_KEY : LOVABLE_CLOUD_KEY;

console.log('Supabase client using:', isExternalConfigured ? 'External Supabase' : 'Lovable Cloud');

// Create the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export flag for checking which instance is being used
export const isExternalSupabaseConfigured = isExternalConfigured;
