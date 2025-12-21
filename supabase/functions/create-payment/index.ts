import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES = {
  starter: 1500000, // ₦15,000 in kobo
  pro: 3500000, // ₦35,000 in kobo
  enterprise: 10000000, // ₦100,000 in kobo
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth user using anon key client with the user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { plan, callback_url } = await req.json();

    if (!plan || !PLAN_PRICES[plan as keyof typeof PLAN_PRICES]) {
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

    // Create Paystack transaction
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: pharmacyEmail,
        amount: PLAN_PRICES[plan as keyof typeof PLAN_PRICES],
        callback_url: callback_url || `${req.headers.get("origin")}/settings`,
        metadata: {
          pharmacy_id: staff.pharmacy_id,
          plan: plan,
          pharmacy_name: pharmacyName,
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
      amount: PLAN_PRICES[plan as keyof typeof PLAN_PRICES] / 100,
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
