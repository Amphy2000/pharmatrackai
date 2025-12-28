import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");
const ADMIN_WHATSAPP = "2349169153129";

interface ExpiringPromotion {
  medication_id: string;
  medication_name: string;
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_phone: string | null;
  pharmacy_email: string;
  days_until_expiry: number;
  featured_until: string;
}

async function sendSMS(phone: string, message: string) {
  if (!TERMII_API_KEY) {
    console.log("TERMII_API_KEY not configured, skipping SMS");
    return;
  }

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: "PharmaTrack",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    });

    const result = await response.json();
    console.log("SMS sent:", result);
    return result;
  } catch (error) {
    console.error("SMS error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get promotions expiring in 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysFromNowStr = twoDaysFromNow.toISOString().split('T')[0];
    
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    const oneDayFromNowStr = oneDayFromNow.toISOString().split('T')[0];

    // Get medications expiring in 2 days
    const { data: expiringIn2Days, error: error2Days } = await supabase
      .from("medications")
      .select(`
        id,
        name,
        featured_until,
        pharmacy_id,
        pharmacies!inner (
          name,
          phone,
          email
        )
      `)
      .eq("is_featured", true)
      .gte("featured_until", `${twoDaysFromNowStr}T00:00:00`)
      .lt("featured_until", `${twoDaysFromNowStr}T23:59:59`);

    if (error2Days) throw error2Days;

    // Get medications expiring in 1 day (final reminder)
    const { data: expiringIn1Day, error: error1Day } = await supabase
      .from("medications")
      .select(`
        id,
        name,
        featured_until,
        pharmacy_id,
        pharmacies!inner (
          name,
          phone,
          email
        )
      `)
      .eq("is_featured", true)
      .gte("featured_until", `${oneDayFromNowStr}T00:00:00`)
      .lt("featured_until", `${oneDayFromNowStr}T23:59:59`);

    if (error1Day) throw error1Day;

    const sentReminders: string[] = [];

    // Send 2-day reminders
    for (const med of expiringIn2Days || []) {
      const pharmacy = (med as any).pharmacies;
      const phone = pharmacy?.phone?.replace(/\D/g, "") || "";
      
      if (phone) {
        const message = `PharmaTrack: Your featured promotion for "${med.name}" expires in 2 days. Renew now to stay visible on the marketplace. Visit your dashboard to extend.`;
        await sendSMS(phone, message);
        sentReminders.push(`2-day: ${med.name} (${pharmacy?.name})`);
      }

      // Create notification in the database
      await supabase.from("notifications").insert({
        pharmacy_id: med.pharmacy_id,
        title: "Promotion Expiring Soon",
        message: `Your featured promotion for "${med.name}" expires in 2 days. Renew to stay visible.`,
        type: "warning",
        priority: "high",
        link: "/settings",
        entity_type: "medication",
        entity_id: med.id,
      });
    }

    // Send 1-day reminders (final warning)
    for (const med of expiringIn1Day || []) {
      const pharmacy = (med as any).pharmacies;
      const phone = pharmacy?.phone?.replace(/\D/g, "") || "";
      
      if (phone) {
        const message = `⚠️ FINAL: Your featured promotion for "${med.name}" expires TOMORROW. Renew immediately to avoid losing visibility on PharmaTrack marketplace.`;
        await sendSMS(phone, message);
        sentReminders.push(`1-day: ${med.name} (${pharmacy?.name})`);
      }

      // Create notification in the database
      await supabase.from("notifications").insert({
        pharmacy_id: med.pharmacy_id,
        title: "Promotion Expires Tomorrow!",
        message: `FINAL WARNING: Your featured promotion for "${med.name}" expires tomorrow. Renew now!`,
        type: "warning",
        priority: "urgent",
        link: "/settings",
        entity_type: "medication",
        entity_id: med.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: sentReminders.length,
        details: sentReminders,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
