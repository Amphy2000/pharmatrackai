// Main Supabase client wrapper
// ALWAYS prefer external Supabase credentials when available
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// External Supabase credentials (user's own Supabase project)
const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Lovable Cloud credentials (fallback)
const CLOUD_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CLOUD_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Check if external Supabase is configured - must have valid URL and key
const isExternalSupabaseConfigured = !!(
  EXTERNAL_SUPABASE_URL && 
  EXTERNAL_SUPABASE_URL.trim() !== '' && 
  EXTERNAL_SUPABASE_KEY && 
  EXTERNAL_SUPABASE_KEY.trim() !== ''
);

// Use external Supabase if configured, otherwise fall back to Lovable Cloud
const SUPABASE_URL = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_URL! : CLOUD_SUPABASE_URL;
const SUPABASE_KEY = isExternalSupabaseConfigured ? EXTERNAL_SUPABASE_KEY! : CLOUD_SUPABASE_KEY;

// Log which Supabase instance is being used (helpful for debugging)
console.log('🔌 Supabase client using:', isExternalSupabaseConfigured ? `External (${SUPABASE_URL})` : 'Lovable Cloud');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { isExternalSupabaseConfigured };
