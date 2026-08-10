/**
 * save-push-subscription
 *
 * Called by the frontend immediately after the user grants notification
 * permission and the browser creates a PushSubscription.
 *
 * Stores or updates the subscription endpoint + crypto keys in
 * public.push_subscriptions so the server-side cron job can reach
 * the user's device even when the browser is fully closed.
 *
 * Method: POST
 * Auth:   Requires valid Supabase JWT (anon key from client)
 * Body:   { endpoint, keys: { p256dh, auth }, pharmacy_id, user_agent? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Use the calling user's JWT so RLS policies apply
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { endpoint, keys, pharmacy_id, user_agent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth || !pharmacy_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: endpoint, keys.p256dh, keys.auth, pharmacy_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert: update if same (user_id, endpoint) already exists
    const { error: upsertError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          pharmacy_id,
          endpoint,
          p256dh: keys.p256dh,
          auth_key: keys.auth,
          user_agent: user_agent ?? req.headers.get("User-Agent") ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" }
      );

    if (upsertError) {
      console.error("[save-push-subscription] Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save subscription", detail: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[save-push-subscription] Saved subscription for user ${user.id}, pharmacy ${pharmacy_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Push subscription saved" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[save-push-subscription] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
