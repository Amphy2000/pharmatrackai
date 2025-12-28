import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  pharmacy_id: string;
  medication_name: string;
  quantity: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pharmacy_id, medication_name, quantity } = (await req.json()) as LeadPayload;

    console.log("Received WhatsApp lead notification request:", { pharmacy_id, medication_name, quantity });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pharmacy details to find owner phone
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacies")
      .select("id, name, phone, termii_sender_id")
      .eq("id", pharmacy_id)
      .single();

    if (pharmacyError || !pharmacy) {
      console.error("Pharmacy not found:", pharmacyError);
      return new Response(
        JSON.stringify({ error: "Pharmacy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pharmacy.phone) {
      console.log("Pharmacy has no phone number, skipping SMS");
      return new Response(
        JSON.stringify({ message: "No phone number available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Termii API key from environment
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    
    if (!termiiApiKey) {
      console.error("TERMII_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Termii (Nigerian format)
    let phoneNumber = pharmacy.phone.replace(/\D/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "234" + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith("234")) {
      phoneNumber = "234" + phoneNumber;
    }

    // Compose SMS message
    const message = `PharmaTrack Lead: Someone wants to order ${quantity}x ${medication_name}. Check your WhatsApp for details!`;

    // Send SMS via Termii
    const termiiResponse = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: phoneNumber,
        from: pharmacy.termii_sender_id || "PharmaTrack",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: termiiApiKey,
      }),
    });

    const termiiResult = await termiiResponse.json();
    console.log("Termii response:", termiiResult);

    // Log the sent alert
    await supabase.from("sent_alerts").insert({
      pharmacy_id: pharmacy_id,
      alert_type: "whatsapp_lead",
      channel: "sms",
      recipient_phone: phoneNumber,
      message: message,
      status: termiiResult.message_id ? "sent" : "failed",
      termii_message_id: termiiResult.message_id || null,
      items_included: [{ medication_name, quantity }],
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: termiiResult.message_id,
        status: termiiResult.message_id ? "sent" : "failed"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-whatsapp-lead:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});