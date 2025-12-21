import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan pricing in kobo (1 Naira = 100 kobo)
const PLAN_CONFIG = {
  starter: { 
    setupFee: 15000000,   // ₦150,000 one-time setup
    monthlyFee: 1000000,  // ₦10,000/month maintenance
    isHybrid: true,
  },
  pro: { 
    setupFee: 0,
    monthlyFee: 3500000,  // ₦35,000/month
    isHybrid: false,
  },
  enterprise: { 
    setupFee: 100000000,  // ₦1,000,000+ (contact sales)
    monthlyFee: 0,
    isHybrid: false,
  },
};

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

    // Get auth header and extract JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user with the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      const code = (authError as any)?.code || (authError as any)?.error_code || 'unauthorized';
      console.error("Auth error:", authError);
      const message = code === 'session_not_found'
        ? 'Session expired. Please sign in again.'
        : 'Unauthorized';
      return new Response(JSON.stringify({ error: message, code }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Authenticated user:", user.id);

    const { plan, callback_url } = await req.json();

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    if (!plan || !planConfig) {
      throw new Error("Invalid plan selected");
    }

    // Get pharmacy for this user
    const { data: staff } = await supabase
      .from("pharmacy_staff")
      .select("pharmacy_id, pharmacies(email, name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff?.pharmacy_id) {
      throw new Error("Pharmacy not found");
    }

    const pharmacyEmail = (staff.pharmacies as any)?.email || user.email;
    const pharmacyName = (staff.pharmacies as any)?.name || "Pharmacy";

    // Determine amount based on plan type
    // For hybrid plans (starter): charge setup fee first, then set up recurring
    // For subscription plans (pro): charge monthly fee
    const chargeAmount = planConfig.isHybrid ? planConfig.setupFee : planConfig.monthlyFee;

    if (chargeAmount === 0) {
      throw new Error("Enterprise plan requires contacting sales");
    }

    // Create Paystack transaction
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: pharmacyEmail,
        amount: chargeAmount,
        callback_url: callback_url || `${req.headers.get("origin")}/settings`,
        metadata: {
          pharmacy_id: staff.pharmacy_id,
          plan: plan,
          pharmacy_name: pharmacyName,
          is_hybrid: planConfig.isHybrid,
          monthly_fee: planConfig.monthlyFee,
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
      amount: chargeAmount / 100, // Convert from kobo to naira
      plan: plan,
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
    console.error("Payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
