import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "low_stock" | "expiry_warning" | "daily_summary";
  pharmacyId: string;
  recipientPhone: string;
  channel: "sms" | "whatsapp";
  data?: {
    medications?: Array<{ name: string; stock?: number; expiryDate?: string; daysUntilExpiry?: number }>;
    summary?: {
      totalSales: number;
      itemsSold: number;
      topProduct: string;
      currency: string;
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Missing Twilio credentials");
      throw new Error("Twilio credentials not configured");
    }

    const { type, pharmacyId, recipientPhone, channel, data }: NotificationRequest = await req.json();
    console.log(`Processing ${type} notification for pharmacy ${pharmacyId} via ${channel}`);

    // Format message based on type
    let message = "";
    
    switch (type) {
      case "low_stock":
        if (data?.medications && data.medications.length > 0) {
          const items = data.medications.slice(0, 5).map(m => `• ${m.name}: ${m.stock} units`).join("\n");
          message = `⚠️ LOW STOCK ALERT\n\nThe following medications need restocking:\n${items}${data.medications.length > 5 ? `\n...and ${data.medications.length - 5} more` : ""}\n\nPlease reorder soon.`;
        }
        break;
        
      case "expiry_warning":
        if (data?.medications && data.medications.length > 0) {
          const items = data.medications.slice(0, 5).map(m => `• ${m.name}: ${m.daysUntilExpiry} days`).join("\n");
          message = `🚨 EXPIRY WARNING\n\nThese medications are expiring soon:\n${items}${data.medications.length > 5 ? `\n...and ${data.medications.length - 5} more` : ""}\n\nTake action immediately.`;
        }
        break;
        
      case "daily_summary":
        if (data?.summary) {
          const { totalSales, itemsSold, topProduct, currency } = data.summary;
          message = `📊 DAILY SALES SUMMARY\n\n💰 Total Sales: ${currency}${totalSales.toLocaleString()}\n📦 Items Sold: ${itemsSold}\n🏆 Top Product: ${topProduct}\n\nGreat job today!`;
        }
        break;
    }

    if (!message) {
      console.log("No message to send - empty data");
      return new Response(JSON.stringify({ success: false, error: "No data to send" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format phone number for WhatsApp
    const to = channel === "whatsapp" ? `whatsapp:${recipientPhone}` : recipientPhone;
    const from = channel === "whatsapp" ? `whatsapp:${twilioPhone}` : twilioPhone;

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", from);
    formData.append("Body", message);

    console.log(`Sending ${channel} message to ${to}`);
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const twilioResult = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      throw new Error(twilioResult.message || "Failed to send notification");
    }

    console.log("Notification sent successfully:", twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        status: twilioResult.status 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
