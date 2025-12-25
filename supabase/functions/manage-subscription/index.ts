import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, cancellation_reason } = await req.json();
    console.log(`Managing subscription for user ${user.id}, action: ${action}`);

    // Get pharmacy for this user
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (pharmacyError || !pharmacy) {
      console.error('Pharmacy error:', pharmacyError);
      return new Response(
        JSON.stringify({ error: 'Pharmacy not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscriptionCode = pharmacy.paystack_subscription_code;

    if (action === 'toggle_auto_renew') {
      const newAutoRenew = !pharmacy.auto_renew;
      
      // If we have a Paystack subscription, manage it there too
      if (subscriptionCode && paystackSecretKey) {
        const endpoint = newAutoRenew ? 'enable' : 'disable';
        const paystackResponse = await fetch(
          `https://api.paystack.co/subscription/${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: subscriptionCode,
              token: pharmacy.paystack_customer_code, // email token for disable
            }),
          }
        );
        
        const paystackData = await paystackResponse.json();
        console.log(`Paystack ${endpoint} response:`, paystackData);
        
        if (!paystackData.status) {
          console.warn('Paystack subscription management failed:', paystackData.message);
          // Continue anyway - we'll still update local state
        }
      }

      // Update local database
      const { error: updateError } = await supabase
        .from('pharmacies')
        .update({ auto_renew: newAutoRenew })
        .eq('id', pharmacy.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update auto-renew setting' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Auto-renew ${newAutoRenew ? 'enabled' : 'disabled'} for pharmacy ${pharmacy.id}`);
      return new Response(
        JSON.stringify({ success: true, auto_renew: newAutoRenew }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel') {
      // Cancel the Paystack subscription if exists
      if (subscriptionCode && paystackSecretKey) {
        const paystackResponse = await fetch(
          `https://api.paystack.co/subscription/disable`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: subscriptionCode,
              token: pharmacy.paystack_customer_code,
            }),
          }
        );
        
        const paystackData = await paystackResponse.json();
        console.log('Paystack cancel response:', paystackData);
      }

      // Update database with cancellation info
      const { error: updateError } = await supabase
        .from('pharmacies')
        .update({
          subscription_status: 'cancelled',
          auto_renew: false,
          cancellation_reason: cancellation_reason || null,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', pharmacy.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to cancel subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Subscription cancelled for pharmacy ${pharmacy.id}, reason: ${cancellation_reason}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Subscription cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
