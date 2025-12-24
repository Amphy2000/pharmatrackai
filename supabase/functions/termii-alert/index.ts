import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  pharmacyId: string;
  alertType: 'low_stock' | 'expiring' | 'expired' | 'custom' | 'daily_summary';
  message: string;
  recipientPhone: string;
  channel: 'sms' | 'whatsapp';
  itemName?: string;
  itemValue?: number;
  daysLeft?: number;
  currentStock?: number;
  suggestedReorder?: number;
}

// Termii API configuration
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    if (!termiiApiKey) {
      console.error('Missing Termii API key');
      return new Response(
        JSON.stringify({ error: 'Termii API key not configured. Please add your TERMII_API_KEY in settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      pharmacyId, 
      alertType, 
      message, 
      recipientPhone, 
      channel,
      itemName,
      itemValue,
      daysLeft,
      currentStock,
      suggestedReorder
    } = await req.json() as AlertRequest;

    if (!recipientPhone || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipientPhone and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user has access to this pharmacy
    const { data: staffRecord } = await supabaseAdmin
      .from('pharmacy_staff')
      .select('id')
      .eq('user_id', user.id)
      .eq('pharmacy_id', pharmacyId)
      .eq('is_active', true)
      .maybeSingle();

    if (!staffRecord) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not have access to this pharmacy' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number - ensure it's in international format without +
    let formattedPhone = recipientPhone.replace(/\s+/g, '').replace(/^[+]/, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1); // Default to Nigeria
    }

    // Get pharmacy name and sender ID for personalization
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('name, termii_sender_id')
      .eq('id', pharmacyId)
      .single();

    const pharmacyName = pharmacy?.name || 'PharmaTrack';
    // Use configured sender ID, or fallback to pharmacy name (first 11 chars)
    const senderId = pharmacy?.termii_sender_id || pharmacyName.substring(0, 11).replace(/\s+/g, '');

    // Build formatted message based on alert type
    let formattedMessage = '';
    
    switch (alertType) {
      case 'expiring':
        formattedMessage = `🚨 ${pharmacyName} AI: Expiry Alert

Boss, you have stock nearing expiry!

📦 Product: ${itemName || 'Multiple items'}
🗓️ Days Left: ${daysLeft !== undefined ? `${daysLeft} days` : 'Soon'}
💰 Value at Risk: ₦${itemValue?.toLocaleString() || '0'}

💡 AI Suggestion: Apply a 20% Discount now to clear this stock before it's a total loss.

Reply DISCOUNT to apply automatically.`;
        break;
        
      case 'low_stock':
        formattedMessage = `📉 ${pharmacyName} AI: Low Stock Alert

You are running out of a fast-moving item!

📦 Product: ${itemName || 'Multiple items'}
📊 Current Stock: ${currentStock !== undefined ? `${currentStock} units left` : 'Low'}
🛒 Suggested Reorder: ${suggestedReorder || 50} units

Click to generate Purchase Order.`;
        break;
        
      case 'expired':
        formattedMessage = `🚨 ${pharmacyName}: URGENT - Expired Stock

📦 Product: ${itemName || 'Multiple items'}
⚠️ Status: EXPIRED - Do not sell!

Remove from shelves immediately to comply with NAFDAC regulations.`;
        break;
        
      case 'daily_summary':
        formattedMessage = `📊 ${pharmacyName} Daily Summary

${message}

Stay profitable! 💰`;
        break;
        
      default:
        formattedMessage = `📢 ${pharmacyName} Alert

${message}`;
    }

    console.log(`Sending ${channel} alert to ${formattedPhone} for pharmacy ${pharmacyId}`);

    // Send via Termii API
    let termiiResponse;
    let termiiData;

    if (channel === 'whatsapp') {
      // Termii WhatsApp API - requires Device ID
      const whatsappDeviceId = Deno.env.get('TERMII_WHATSAPP_DEVICE_ID');
      if (!whatsappDeviceId) {
        console.error('Missing TERMII_WHATSAPP_DEVICE_ID');
        return new Response(
          JSON.stringify({ error: 'WhatsApp Device ID not configured. Please add your TERMII_WHATSAPP_DEVICE_ID in settings.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      termiiResponse = await fetch(`${TERMII_BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: termiiApiKey,
          to: formattedPhone,
          from: senderId,
          sms: formattedMessage,
          type: 'plain',
          channel: 'whatsapp',
          device_id: whatsappDeviceId,
        }),
      });
    } else {
      // Termii SMS API
      termiiResponse = await fetch(`${TERMII_BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: termiiApiKey,
          to: formattedPhone,
          from: senderId,
          sms: formattedMessage,
          type: 'plain',
          channel: 'generic',
        }),
      });
    }

    termiiData = await termiiResponse.json();

    if (!termiiResponse.ok || termiiData.code !== 'ok') {
      console.error('Termii error:', termiiData);
      return new Response(
        JSON.stringify({ 
          error: termiiData.message || 'Failed to send alert via Termii',
          details: termiiData 
        }),
        { status: termiiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Alert sent successfully:', termiiData.message_id);

    // Log the alert in audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      action: 'alert_sent',
      entity_type: 'alert',
      pharmacy_id: pharmacyId,
      user_id: user.id,
      details: {
        alert_type: alertType,
        channel,
        recipient: formattedPhone,
        message_id: termiiData.message_id,
        provider: 'termii',
        item_name: itemName,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: termiiData.message_id,
        status: 'sent',
        balance: termiiData.balance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in termii-alert function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
