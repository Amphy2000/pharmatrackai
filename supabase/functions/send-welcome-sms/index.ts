import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeSMSRequest {
  pharmacyId: string;
  ownerName: string;
  phone: string;
}

// Termii API configuration
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    if (!termiiApiKey) {
      console.error('Missing Termii API key');
      // Log error but don't fail - user should still be able to register
      await logError(supabaseAdmin, null, 'Missing TERMII_API_KEY configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Termii API key not configured', logged: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pharmacyId, ownerName, phone } = await req.json() as WelcomeSMSRequest;

    if (!phone || !ownerName || !pharmacyId) {
      console.error('Missing required fields:', { pharmacyId, ownerName, phone: phone ? 'provided' : 'missing' });
      await logError(supabaseAdmin, pharmacyId, 'Missing required fields for welcome SMS');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields', logged: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number - ensure it's in international format without +
    let formattedPhone = phone.replace(/\s+/g, '').replace(/^[+]/, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1); // Default to Nigeria
    }

    // Validate phone format
    if (!formattedPhone.match(/^\d{10,15}$/)) {
      console.error('Invalid phone format:', formattedPhone);
      await logError(supabaseAdmin, pharmacyId, `Invalid phone format: ${formattedPhone}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone format', logged: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pharmacy's sender ID
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('termii_sender_id')
      .eq('id', pharmacyId)
      .single();

    const senderId = pharmacy?.termii_sender_id || 'PharmaTrack';

    // Build welcome message
    const welcomeMessage = `Welcome to PharmaTrack AI, ${ownerName}! 🚀 Your pharmacy is now set up. Log in to start protecting your stock and stopping waste. We are excited to help you grow!`;

    console.log(`Sending welcome SMS to ${formattedPhone} for pharmacy ${pharmacyId}`);

    // Send via Termii SMS API
    const termiiResponse = await fetch(`${TERMII_BASE_URL}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: termiiApiKey,
        to: formattedPhone,
        from: senderId,
        sms: welcomeMessage,
        type: 'plain',
        channel: 'generic',
      }),
    });

    const termiiData = await termiiResponse.json();

    if (!termiiResponse.ok || termiiData.code !== 'ok') {
      console.error('Termii error:', termiiData);
      await logError(supabaseAdmin, pharmacyId, `Termii error: ${termiiData.message || JSON.stringify(termiiData)}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: termiiData.message || 'Failed to send welcome SMS',
          logged: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Welcome SMS sent successfully:', termiiData.message_id);

    // Log success in audit_logs
    await supabaseAdmin.from('audit_logs').insert({
      action: 'welcome_sms_sent',
      entity_type: 'pharmacy',
      entity_id: pharmacyId,
      pharmacy_id: pharmacyId,
      details: {
        recipient: formattedPhone,
        message_id: termiiData.message_id,
        provider: 'termii',
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: termiiData.message_id,
        balance: termiiData.balance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in send-welcome-sms function:', error);
    
    // Try to log error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await logError(supabaseAdmin, null, `Unexpected error: ${errorMessage}`);
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }

    // Return success to not block user registration
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, logged: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function logError(supabaseAdmin: any, pharmacyId: string | null, message: string) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action: 'welcome_sms_failed',
      entity_type: 'system',
      pharmacy_id: pharmacyId,
      details: {
        error: message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Failed to log error to database:', err);
  }
}
