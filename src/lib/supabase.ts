// Main Supabase client wrapper (External only)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL as string | undefined;
const EXTERNAL_SUPABASE_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const externalSupabaseUrl = EXTERNAL_SUPABASE_URL;

export const isExternalSupabaseConfigured = Boolean(
  EXTERNAL_SUPABASE_URL &&
    EXTERNAL_SUPABASE_URL.trim() !== "" &&
    EXTERNAL_SUPABASE_KEY &&
    EXTERNAL_SUPABASE_KEY.trim() !== ""
);

const externalConfigError = () =>
  new Error(
    [
      "External backend not configured.",
      "Missing VITE_EXTERNAL_SUPABASE_URL and/or VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY.",
      "Set both Secrets, then hard refresh."
    ].join(" ")
  );

let _client: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!isExternalSupabaseConfigured) throw externalConfigError();

  if (_client) return _client;

  console.log("🔌 Supabase client using External:", EXTERNAL_SUPABASE_URL);

  _client = createClient<Database>(EXTERNAL_SUPABASE_URL!, EXTERNAL_SUPABASE_KEY!, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return _client;
};

// Proxy prevents crashing at module-eval time; errors are thrown on first actual usage.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient() as any;
    const value = client[prop as any];
    return typeof value === "function" ? value.bind(client) : value;
  }
});

