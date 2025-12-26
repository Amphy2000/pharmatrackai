import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRANCH_FEE = 1500000; // ₦15,000 per branch in kobo

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { new_branch_limit, callback_url } = await req.json();

    if (!new_branch_limit || new_branch_limit < 1) {
      throw new Error("Invalid branch limit");
    }

    // Get pharmacy for this user
    const { data: staff } = await supabase
      .from("pharmacy_staff")
      .select("pharmacy_id, pharmacies(email, name, active_branches_limit, subscription_plan)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff?.pharmacy_id) {
      throw new Error("Pharmacy not found");
    }

    const pharmacy = staff.pharmacies as any;
    const currentLimit = pharmacy?.active_branches_limit || 1;
    const pharmacyEmail = pharmacy?.email || user.email;
    const pharmacyName = pharmacy?.name || "Pharmacy";

    // Can only upgrade, not downgrade
    if (new_branch_limit <= currentLimit) {
      throw new Error("New branch limit must be greater than current limit");
    }

    // Must be on Pro plan for multi-branch
    if (pharmacy?.subscription_plan !== 'pro' && pharmacy?.subscription_plan !== 'enterprise') {
      throw new Error("Multi-branch requires Pro or Enterprise plan");
    }

    const additionalBranches = new_branch_limit - currentLimit;
    const chargeAmount = additionalBranches * BRANCH_FEE;

    // Create Paystack transaction for branch upgrade
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: pharmacyEmail,
        amount: chargeAmount,
        callback_url: callback_url || `${req.headers.get("origin")}/settings?tab=subscription`,
        metadata: {
          pharmacy_id: staff.pharmacy_id,
          pharmacy_name: pharmacyName,
          transaction_type: "branch_upgrade",
          current_limit: currentLimit,
          new_limit: new_branch_limit,
          additional_branches: additionalBranches,
        },
      }),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || "Failed to initialize payment");
    }

    // Create pending payment record
    await supabase.from("subscription_payments").insert({
      pharmacy_id: staff.pharmacy_id,
      amount: chargeAmount / 100,
      plan: 'pro', // Branch upgrades are part of Pro plan
      status: "pending",
      paystack_reference: result.data.reference,
    });

    return new Response(JSON.stringify({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Branch upgrade error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
