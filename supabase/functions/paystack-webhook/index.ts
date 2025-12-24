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

// Plan configuration matching the frontend
const PLAN_CONFIG = {
  starter: { setupFee: 15000000, monthlyFee: 1000000, isHybrid: true }, // Kobo
  pro: { setupFee: 0, monthlyFee: 3500000, isHybrid: false },
  enterprise: { setupFee: 0, monthlyFee: 0, isHybrid: false },
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

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // SECURITY: Require signature for all webhook requests
    if (!signature) {
      console.error("Missing Paystack signature - rejecting request");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature using Web Crypto API
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
      console.error("Invalid Paystack signature - rejecting request");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Paystack webhook signature verified successfully");

    const event = JSON.parse(body);
    console.log("Paystack event:", event.event, JSON.stringify(event.data, null, 2));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event.event) {
      case "charge.success": {
        const data = event.data;
        const customerEmail = data.customer?.email;
        const amount = data.amount; // In kobo
        const reference = data.reference;
        const metadata = data.metadata || {};
        
        console.log(`Charge success: email=${customerEmail}, amount=${amount}, reference=${reference}`);
        
        if (customerEmail) {
          // Find pharmacy by email
          const { data: pharmacy } = await supabase
            .from("pharmacies")
            .select("id, subscription_plan")
            .eq("email", customerEmail)
            .maybeSingle();

          if (pharmacy) {
            // Determine what type of payment this is
            const isStarterSetup = amount === PLAN_CONFIG.starter.setupFee;
            const isStarterMonthly = amount === PLAN_CONFIG.starter.monthlyFee;
            const isProMonthly = amount === PLAN_CONFIG.pro.monthlyFee;
            
            let plan = "starter";
            let maxUsers = 1;
            
            if (isStarterSetup || isStarterMonthly) {
              plan = "starter";
              maxUsers = 1;
            } else if (isProMonthly) {
              plan = "pro";
              maxUsers = 5;
            } else if (amount >= 10000000) { // 100k+ for enterprise
              plan = "enterprise";
              maxUsers = 999;
            }

            // Update pharmacy subscription
            await supabase
              .from("pharmacies")
              .update({
                subscription_status: "active",
                subscription_plan: plan,
                subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                paystack_customer_code: data.customer?.customer_code,
                max_users: maxUsers,
              })
              .eq("id", pharmacy.id);

            // Update payment status
            if (reference) {
              await supabase
                .from("subscription_payments")
                .update({
                  status: "completed",
                  paystack_transaction_id: data.id?.toString(),
                })
                .eq("paystack_reference", reference);
            }

            console.log(`Subscription activated for pharmacy ${pharmacy.id}, plan: ${plan}`);

            // If this was a Starter setup payment (₦150k), create recurring subscription for ₦10k/month
            if (isStarterSetup && data.customer?.customer_code) {
              console.log("Creating recurring subscription for Starter plan maintenance...");
              
              try {
                // First, create a plan for the monthly maintenance
                const planResponse = await fetch("https://api.paystack.co/plan", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${paystackSecret}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: `PharmaTrack Starter Maintenance - ${pharmacy.id.slice(0, 8)}`,
                    amount: PLAN_CONFIG.starter.monthlyFee, // 1000000 kobo = ₦10,000
                    interval: "monthly",
                    description: "Monthly cloud maintenance for PharmaTrack Starter plan",
                  }),
                });

                const planData = await planResponse.json();
                console.log("Plan creation response:", JSON.stringify(planData));

                if (planData.status && planData.data?.plan_code) {
                  // Create subscription for the customer
                  const subscriptionResponse = await fetch("https://api.paystack.co/subscription", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${paystackSecret}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      customer: data.customer.customer_code,
                      plan: planData.data.plan_code,
                      start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Start in 30 days
                    }),
                  });

                  const subscriptionData = await subscriptionResponse.json();
                  console.log("Subscription creation response:", JSON.stringify(subscriptionData));

                  if (subscriptionData.status && subscriptionData.data?.subscription_code) {
                    // Update pharmacy with subscription code
                    await supabase
                      .from("pharmacies")
                      .update({
                        paystack_subscription_code: subscriptionData.data.subscription_code,
                      })
                      .eq("id", pharmacy.id);

                    console.log(`Recurring subscription created: ${subscriptionData.data.subscription_code}`);
                  }
                }
              } catch (subError) {
                console.error("Error creating recurring subscription:", subError);
                // Don't throw - the main payment succeeded
              }
            }
          }
        }
        break;
      }

      case "subscription.create": {
        const data = event.data;
        const customerEmail = data.customer?.email;
        
        console.log(`Subscription created for: ${customerEmail}`);
        
        if (customerEmail) {
          const { data: pharmacy } = await supabase
            .from("pharmacies")
            .select("id")
            .eq("email", customerEmail)
            .maybeSingle();

          if (pharmacy) {
            await supabase
              .from("pharmacies")
              .update({
                paystack_subscription_code: data.subscription_code,
              })
              .eq("id", pharmacy.id);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const data = event.data;
        const subscriptionCode = data.subscription?.subscription_code;
        
        console.log(`Payment failed for subscription: ${subscriptionCode}`);
        
        if (subscriptionCode) {
          // Mark as payment failed but don't immediately cancel
          await supabase
            .from("pharmacies")
            .update({
              subscription_status: "expired",
            })
            .eq("paystack_subscription_code", subscriptionCode);
        }
        break;
      }

      case "subscription.disable":
      case "subscription.not_renew": {
        const data = event.data;
        const subscriptionCode = data.subscription_code;

        console.log(`Subscription cancelled/disabled: ${subscriptionCode}`);

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
