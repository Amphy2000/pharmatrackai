// Main Supabase client wrapper (External only)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { readExternalBackendConfig } from "@/lib/externalBackendConfig";

const externalConfigError = () =>
  new Error(
    [
      "External backend not configured.",
      "Missing VITE_EXTERNAL_SUPABASE_URL and/or VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY.",
      "If you've already set them, publish the app or let it load runtime config, then refresh.",
    ].join(" ")
  );

export const isExternalSupabaseConfigured = () => Boolean(readExternalBackendConfig());

let _client: SupabaseClient<Database> | null = null;
let _clientUrl: string | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  const cfg = readExternalBackendConfig();
  if (!cfg) throw externalConfigError();

  // Reuse client if same URL
  if (_client && _clientUrl === cfg.url) return _client;

  console.log("🔌 Supabase client using External:", cfg.url);

  _clientUrl = cfg.url;
  _client = createClient<Database>(cfg.url, cfg.publishableKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _client;
};

// Proxy prevents crashing at module-eval time; errors are thrown on first actual usage.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient() as any;
    const value = client[prop as any];
    return typeof value === "function" ? value.bind(client) : value;
  },
});


