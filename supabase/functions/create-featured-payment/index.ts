import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Featured pricing in kobo (1 Naira = 100 kobo)
const FEATURED_PRICING = {
  7: 100000,   // ₦1,000
  14: 150000,  // ₦1,500
  30: 250000,  // ₦2,500
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { medication_id, medication_name, duration, callback_url } = await req.json();

    if (!medication_id || !duration) {
      throw new Error("Missing required fields");
    }

    const priceKobo = FEATURED_PRICING[duration as keyof typeof FEATURED_PRICING];
    if (!priceKobo) {
      throw new Error("Invalid duration selected");
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

    // Create Paystack transaction for inline popup
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: pharmacyEmail,
        amount: priceKobo,
        callback_url: callback_url || `${req.headers.get("origin")}/inventory`,
        channels: ["card", "bank", "ussd", "bank_transfer"],
        metadata: {
          pharmacy_id: staff.pharmacy_id,
          medication_id: medication_id,
          medication_name: medication_name,
          duration: duration,
          type: "featured_product",
          custom_fields: [
            {
              display_name: "Product",
              variable_name: "product",
              value: medication_name,
            },
            {
              display_name: "Duration",
              variable_name: "duration",
              value: `${duration} days`,
            },
          ],
        },
      }),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || "Failed to initialize payment");
    }

    console.log("Payment initialized:", result.data.reference);

    return new Response(JSON.stringify({
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
      amount: priceKobo / 100,
      email: pharmacyEmail,
      key: Deno.env.get("PAYSTACK_PUBLIC_KEY") || "pk_live_YOUR_KEY", // This should be configured
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
