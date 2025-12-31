import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan pricing in kobo (1 Naira = 100 kobo)
// Annual discount: 40% off
const ANNUAL_DISCOUNT = 0.4;

const PLAN_CONFIG = {
  lite: { 
    setupFee: 0,
    monthlyFee: 750000,   // ₦7,500/month
    annualFee: Math.round(750000 * 12 * (1 - ANNUAL_DISCOUNT)),  // ₦54,000/year
    isHybrid: false,
  },
  starter: { 
    setupFee: 15000000,   // ₦150,000 one-time setup
    monthlyFee: 1000000,  // ₦10,000/month maintenance
    annualFee: Math.round(1000000 * 12 * (1 - ANNUAL_DISCOUNT)),  // ₦72,000/year
    isHybrid: true,
  },
  pro: { 
    setupFee: 0,
    monthlyFee: 3500000,  // ₦35,000/month
    annualFee: Math.round(3500000 * 12 * (1 - ANNUAL_DISCOUNT)),  // ₦252,000/year
    isHybrid: false,
  },
  enterprise: { 
    setupFee: 0,
    monthlyFee: 0,
    annualFee: 0,
    isHybrid: false,
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY not configured");
      throw new Error("Payment service not configured. Please contact support.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth header and extract JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create service role client for all operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user with the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(JSON.stringify({ 
        error: "Session expired. Please sign in again.",
        code: "session_expired"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Authenticated user:", user.id);

    const { plan, callback_url, billing_period } = await req.json();
    console.log("Payment request for plan:", plan, "billing:", billing_period || 'monthly');

    const isAnnual = billing_period === 'annual';
    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    if (!plan || !planConfig) {
      throw new Error("Invalid plan selected");
    }

    // Get pharmacy for this user
    const { data: staff, error: staffError } = await supabase
      .from("pharmacy_staff")
      .select("pharmacy_id, pharmacies(email, name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError) {
      console.error("Staff lookup error:", staffError.message);
      throw new Error("Could not verify pharmacy membership");
    }

    if (!staff?.pharmacy_id) {
      console.error("No pharmacy found for user:", user.id);
      throw new Error("No pharmacy found for your account");
    }

    const pharmacyEmail = (staff.pharmacies as any)?.email || user.email;
    const pharmacyName = (staff.pharmacies as any)?.name || "Pharmacy";

    console.log("Pharmacy found:", staff.pharmacy_id, pharmacyName);

    // Determine amount based on plan type and billing period
    let chargeAmount: number;
    if (planConfig.isHybrid) {
      // Hybrid plans charge setup fee first, then monthly/annual maintenance
      chargeAmount = planConfig.setupFee;
    } else if (isAnnual && planConfig.annualFee > 0) {
      chargeAmount = planConfig.annualFee;
    } else {
      chargeAmount = planConfig.monthlyFee;
    }

    if (chargeAmount === 0) {
      throw new Error("Enterprise plan requires contacting sales");
    }

    console.log("Initializing Paystack transaction for amount:", chargeAmount);

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
      console.error("Paystack error:", result.message);
      throw new Error(result.message || "Failed to initialize payment");
    }

    console.log("Paystack transaction initialized:", result.data.reference);

    // Create pending payment record
    const { error: insertError } = await supabase.from("subscription_payments").insert({
      pharmacy_id: staff.pharmacy_id,
      amount: chargeAmount / 100, // Convert from kobo to naira
      plan: plan,
      status: "pending",
      paystack_reference: result.data.reference,
    });

    if (insertError) {
      console.error("Payment record insert error:", insertError.message);
      // Don't fail the request, payment can still proceed
    }

    return new Response(JSON.stringify({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Payment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
