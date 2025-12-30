import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERMII_API_KEY = Deno.env.get("TERMII_API_KEY");

async function sendSMS(phone: string, message: string): Promise<boolean> {
  if (!TERMII_API_KEY) {
    console.log("TERMII_API_KEY not configured, skipping SMS");
    return false;
  }

  try {
    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "234" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("234")) {
      cleanPhone = "234" + cleanPhone;
    }

    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: cleanPhone,
        from: "PharmaTrack",
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    });

    const result = await response.json();
    console.log("SMS sent to", cleanPhone, ":", result);
    return response.ok;
  } catch (error) {
    console.error("SMS error:", error);
    return false;
  }
}

async function getEngagementStats(supabase: any, medicationId: string, pharmacyId: string) {
  const [viewsResult, leadsResult] = await Promise.all([
    supabase
      .from("marketplace_views")
      .select("id", { count: "exact" })
      .eq("medication_id", medicationId),
    supabase
      .from("whatsapp_leads")
      .select("id", { count: "exact" })
      .eq("medication_id", medicationId),
  ]);

  return {
    views: viewsResult.count || 0,
    leads: leadsResult.count || 0,
  };
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

    const now = new Date();
    const sentReminders: Array<{
      type: string;
      pharmacy: string;
      medication: string;
      views: number;
      leads: number;
      hours_left?: number;
    }> = [];

    // ============ 6-HOUR WARNING (Re-Up Strategy) ============
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const { data: expiringSoon, error: soonError } = await supabase
      .from("medications")
      .select(`
        id,
        name,
        featured_until,
        pharmacy_id,
        pharmacies!inner (
          name,
          phone,
          marketplace_contact_phone
        )
      `)
      .eq("is_featured", true)
      .gte("featured_until", sixHoursFromNow.toISOString())
      .lte("featured_until", twelveHoursFromNow.toISOString());

    if (soonError) throw soonError;

    for (const med of expiringSoon || []) {
      const pharmacy = (med as any).pharmacies;
      const phone = pharmacy?.marketplace_contact_phone || pharmacy?.phone;
      
      if (!phone) continue;

      // Check if already notified recently
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("entity_id", med.id)
        .eq("entity_type", "featured_expiry_6hr")
        .gte("created_at", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingNotif) continue;

      const stats = await getEngagementStats(supabase, med.id, med.pharmacy_id);
      const hoursLeft = Math.round((new Date(med.featured_until).getTime() - now.getTime()) / (1000 * 60 * 60));

      // ROI-focused message
      const message = `🚀 PharmaTrack: "${med.name}" spotlight ends in ${hoursLeft}hrs! Stats: ${stats.views} views, ${stats.leads} customer inquiries. Extend for ₦1,000/week? Visit app now!`;

      const smsSent = await sendSMS(phone, message);

      await supabase.from("notifications").insert({
        pharmacy_id: med.pharmacy_id,
        title: `⏰ Spotlight Ending: ${med.name}`,
        message: `Your boost expires in ${hoursLeft} hours! You've reached ${stats.views} customers with ${stats.leads} inquiries. Extend now to keep the momentum!`,
        type: "warning",
        priority: "high",
        entity_type: "featured_expiry_6hr",
        entity_id: med.id,
        link: "/marketplace-insights",
        metadata: { views: stats.views, leads: stats.leads, hours_left: hoursLeft, sms_sent: smsSent },
      });

      sentReminders.push({
        type: "6hr-warning",
        pharmacy: pharmacy.name,
        medication: med.name,
        views: stats.views,
        leads: stats.leads,
        hours_left: hoursLeft,
      });
    }

    // ============ 24-HOUR WARNING ============
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const thirtyHoursFromNow = new Date(now.getTime() + 30 * 60 * 60 * 1000);

    const { data: expiringTomorrow, error: tomorrowError } = await supabase
      .from("medications")
      .select(`
        id,
        name,
        featured_until,
        pharmacy_id,
        pharmacies!inner (
          name,
          phone,
          marketplace_contact_phone
        )
      `)
      .eq("is_featured", true)
      .gte("featured_until", twentyFourHoursFromNow.toISOString())
      .lte("featured_until", thirtyHoursFromNow.toISOString());

    if (tomorrowError) throw tomorrowError;

    for (const med of expiringTomorrow || []) {
      const pharmacy = (med as any).pharmacies;
      const phone = pharmacy?.marketplace_contact_phone || pharmacy?.phone;
      
      if (!phone) continue;

      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("entity_id", med.id)
        .eq("entity_type", "featured_expiry_24hr")
        .gte("created_at", new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingNotif) continue;

      const stats = await getEngagementStats(supabase, med.id, med.pharmacy_id);

      const message = `📊 PharmaTrack: "${med.name}" spotlight expires tomorrow. You've gotten ${stats.views} views & ${stats.leads} inquiries so far. Renew to keep growing!`;

      await sendSMS(phone, message);

      await supabase.from("notifications").insert({
        pharmacy_id: med.pharmacy_id,
        title: `Spotlight Expires Tomorrow: ${med.name}`,
        message: `Your featured boost expires in ~24 hours. Current stats: ${stats.views} views, ${stats.leads} customer inquiries.`,
        type: "warning",
        priority: "medium",
        entity_type: "featured_expiry_24hr",
        entity_id: med.id,
        link: "/marketplace-insights",
        metadata: { views: stats.views, leads: stats.leads },
      });

      sentReminders.push({
        type: "24hr-warning",
        pharmacy: pharmacy.name,
        medication: med.name,
        views: stats.views,
        leads: stats.leads,
      });
    }

    // ============ JUST EXPIRED (Re-Up Offer) ============
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: justExpired, error: expiredError } = await supabase
      .from("medications")
      .select(`
        id,
        name,
        featured_until,
        pharmacy_id,
        pharmacies!inner (
          name,
          phone,
          marketplace_contact_phone
        )
      `)
      .eq("is_featured", false)
      .gte("featured_until", oneHourAgo.toISOString())
      .lte("featured_until", now.toISOString());

    if (expiredError) throw expiredError;

    for (const med of justExpired || []) {
      const pharmacy = (med as any).pharmacies;
      const phone = pharmacy?.marketplace_contact_phone || pharmacy?.phone;
      
      if (!phone) continue;

      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("entity_id", med.id)
        .eq("entity_type", "featured_expired")
        .gte("created_at", oneHourAgo.toISOString())
        .maybeSingle();

      if (existingNotif) continue;

      const stats = await getEngagementStats(supabase, med.id, med.pharmacy_id);

      // Strong re-up CTA
      const message = `💰 PharmaTrack: "${med.name}" spotlight ended! Final: ${stats.views} views, ${stats.leads} inquiries. Re-boost for just ₦1,000/week - don't lose momentum! Visit app now.`;

      await sendSMS(phone, message);

      await supabase.from("notifications").insert({
        pharmacy_id: med.pharmacy_id,
        title: `📈 Spotlight Ended: ${med.name}`,
        message: `Your boost has ended. Final results: ${stats.views} customer views, ${stats.leads} WhatsApp inquiries. Re-boost now to maintain visibility!`,
        type: "info",
        priority: "high",
        entity_type: "featured_expired",
        entity_id: med.id,
        link: "/marketplace-insights",
        metadata: { views: stats.views, leads: stats.leads, final: true },
      });

      sentReminders.push({
        type: "expired-reup",
        pharmacy: pharmacy.name,
        medication: med.name,
        views: stats.views,
        leads: stats.leads,
      });
    }

    console.log(`Sent ${sentReminders.length} promotion reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: sentReminders.length,
        details: sentReminders,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in promotion-expiry-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
