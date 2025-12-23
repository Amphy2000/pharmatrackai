import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  pharmacyId: string;
  alertType: 'low_stock' | 'expiring' | 'expired' | 'custom';
  message: string;
  recipientPhone: string;
  channel: 'sms' | 'whatsapp';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pharmacyId, alertType, message, recipientPhone, channel } = await req.json() as AlertRequest;

    if (!recipientPhone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipientPhone and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for WhatsApp if needed
    let toNumber = recipientPhone.startsWith('+') ? recipientPhone : `+${recipientPhone}`;
    if (channel === 'whatsapp') {
      toNumber = `whatsapp:${toNumber}`;
    }

    let fromNumber = twilioPhone;
    if (channel === 'whatsapp') {
      fromNumber = `whatsapp:${twilioPhone}`;
    }

    // Prepare the alert message with emoji prefix based on type
    let formattedMessage = message;
    switch (alertType) {
      case 'low_stock':
        formattedMessage = `⚠️ LOW STOCK ALERT\n\n${message}`;
        break;
      case 'expiring':
        formattedMessage = `⏰ EXPIRY WARNING\n\n${message}`;
        break;
      case 'expired':
        formattedMessage = `🚨 EXPIRED PRODUCT\n\n${message}`;
        break;
      default:
        formattedMessage = `📢 PHARMATRACK ALERT\n\n${message}`;
    }

    console.log(`Sending ${channel} alert to ${toNumber}`);

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', toNumber);
    formData.append('From', fromNumber);
    formData.append('Body', formattedMessage);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      return new Response(
        JSON.stringify({ error: twilioData.message || 'Failed to send alert' }),
        { status: twilioResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Alert sent successfully:', twilioData.sid);

    // Log the alert in audit_logs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('audit_logs').insert({
      action: 'alert_sent',
      entity_type: 'alert',
      pharmacy_id: pharmacyId,
      details: {
        alert_type: alertType,
        channel,
        recipient: recipientPhone,
        message_sid: twilioData.sid,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        status: twilioData.status 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in send-alert function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
