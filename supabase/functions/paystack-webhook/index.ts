import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature using Web Crypto API
    if (signature) {
      const encoder = new TextEncoder();
      const key = await globalThis.crypto.subtle.importKey(
        "raw",
        encoder.encode(paystackSecret),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const signatureBuffer = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const computedSignature = bytesToHex(new Uint8Array(signatureBuffer));

      if (computedSignature !== signature) {
        console.error("Invalid Paystack signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    console.log("Paystack event:", event.event);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.event) {
      case "subscription.create":
      case "charge.success": {
        const data = event.data;
        const customerEmail = data.customer?.email;
        
        if (customerEmail) {
          // Find pharmacy by email
          const { data: pharmacy } = await supabase
            .from("pharmacies")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();

          if (pharmacy) {
            // Determine plan from amount
            let plan = "starter";
            const amount = data.amount / 100; // Convert from kobo
            if (amount >= 35000) plan = "pro";
            if (amount >= 100000) plan = "enterprise";

            // Update pharmacy subscription
            await supabase
              .from("pharmacies")
              .update({
                subscription_status: "active",
                subscription_plan: plan,
                subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                paystack_customer_code: data.customer?.customer_code,
                paystack_subscription_code: data.subscription_code,
              })
              .eq("id", pharmacy.id);

            // Update payment status
            if (data.reference) {
              await supabase
                .from("subscription_payments")
                .update({
                  status: "completed",
                  paystack_transaction_id: data.id?.toString(),
                })
                .eq("paystack_reference", data.reference);
            }

            console.log(`Subscription activated for pharmacy ${pharmacy.id}`);
          }
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const data = event.data;
        const subscriptionCode = data.subscription_code;

        if (subscriptionCode) {
          await supabase
            .from("pharmacies")
            .update({
              subscription_status: "cancelled",
            })
            .eq("paystack_subscription_code", subscriptionCode);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
