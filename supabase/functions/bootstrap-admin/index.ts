import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Get bootstrap admin email from environment variable for security
const getBootstrapEmail = (): string | null => {
  return Deno.env.get("BOOTSTRAP_ADMIN_EMAIL") || null;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user email matches bootstrap admin email from env
    const bootstrapEmail = getBootstrapEmail();
    if (!bootstrapEmail) {
      console.error("BOOTSTRAP_ADMIN_EMAIL environment variable not configured");
      return new Response(
        JSON.stringify({ error: "Bootstrap not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (user.email !== bootstrapEmail) {
      console.log(`Unauthorized bootstrap attempt by: ${user.email}`);
      return new Response(
        JSON.stringify({ error: "Not authorized to become admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already admin
    const { data: existingAdmin } = await supabaseAdmin
      .from('platform_admins')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ success: true, message: "Already a super admin", admin: existingAdmin }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add as super admin
    const { data: newAdmin, error: insertError } = await supabaseAdmin
      .from('platform_admins')
      .insert({
        user_id: user.id,
        role: 'super_admin',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting admin:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Bootstrapped ${user.email} as super_admin`);

    return new Response(
      JSON.stringify({ success: true, message: "Successfully became super admin", admin: newAdmin }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Bootstrap admin error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});