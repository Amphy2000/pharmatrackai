import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'manager' | 'staff';
  pharmacyId: string;
  permissions: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and has permission
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateStaffRequest = await req.json();
    const { email, password, fullName, phone, role, pharmacyId, permissions } = body;

    // Verify requesting user is owner of the pharmacy
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .select('owner_id')
      .eq('id', pharmacyId)
      .single();

    if (pharmacyError || !pharmacy) {
      return new Response(
        JSON.stringify({ error: "Pharmacy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is owner or manager
    const { data: staffRecord } = await supabaseAdmin
      .from('pharmacy_staff')
      .select('role')
      .eq('pharmacy_id', pharmacyId)
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)
      .single();

    const isOwner = pharmacy.owner_id === requestingUser.id;
    const isManager = staffRecord?.role === 'manager' || staffRecord?.role === 'owner';

    if (!isOwner && !isManager) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to add staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user using admin API (doesn't affect current session)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        full_name: fullName,
        phone: phone || null,
      }, { onConflict: 'user_id' });

    // Add as pharmacy staff
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('pharmacy_staff')
      .insert({
        pharmacy_id: pharmacyId,
        user_id: authData.user.id,
        role: role,
        is_active: true,
      })
      .select()
      .single();

    if (staffError) {
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to add staff to pharmacy" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add permissions if staff role
    if (role === 'staff' && permissions.length > 0) {
      await supabaseAdmin
        .from('staff_permissions')
        .insert(
          permissions.map(perm => ({
            staff_id: staffData.id,
            permission_key: perm,
            is_granted: true,
          }))
        );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: authData.user.id, email: authData.user.email },
        staff: staffData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-staff function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
