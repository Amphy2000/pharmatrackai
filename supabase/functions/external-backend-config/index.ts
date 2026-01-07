import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = (Deno.env.get("VITE_EXTERNAL_SUPABASE_URL") || "").trim();
  const publishableKey = (Deno.env.get("VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY") || "").trim();

  const ok = Boolean(url && publishableKey);

  return new Response(
    JSON.stringify({
      ok,
      ...(ok ? { url, publishableKey } : { message: "External backend secrets not set" }),
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
});
