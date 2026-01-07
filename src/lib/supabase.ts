// Main Supabase client wrapper
// Uses user's Supabase credentials from secrets
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Get Supabase credentials - prioritize VITE_SUPABASE_* (user's external Supabase)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase client connecting to:', SUPABASE_URL);

// Create the Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Export flag for checking which instance is being used
export const isExternalSupabaseConfigured = true;
