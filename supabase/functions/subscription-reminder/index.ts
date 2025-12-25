import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const termiiApiKey = Deno.env.get('TERMII_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for expiring subscriptions...');

    // Get pharmacies with active subscriptions expiring within 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const { data: expiringPharmacies, error: fetchError } = await supabase
      .from('pharmacies')
      .select('id, name, email, phone, subscription_ends_at, subscription_plan, termii_sender_id, owner_id')
      .eq('subscription_status', 'active')
      .not('subscription_ends_at', 'is', null)
      .lte('subscription_ends_at', sevenDaysFromNow.toISOString())
      .gte('subscription_ends_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching pharmacies:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiringPharmacies?.length || 0} pharmacies with expiring subscriptions`);

    const results = [];
    
    for (const pharmacy of expiringPharmacies || []) {
      const expiryDate = new Date(pharmacy.subscription_ends_at);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only send notifications at 7 days, 3 days, and 1 day
      if (daysUntilExpiry !== 7 && daysUntilExpiry !== 3 && daysUntilExpiry !== 1) {
        continue;
      }

      // Create in-app notification
      const notificationTitle = daysUntilExpiry === 1 
        ? '⚠️ Subscription Expires Tomorrow!'
        : `📅 Subscription Expires in ${daysUntilExpiry} Days`;
      
      const notificationMessage = daysUntilExpiry === 1
        ? 'Your subscription expires tomorrow. Renew now to avoid service interruption.'
        : `Your ${pharmacy.subscription_plan} subscription expires in ${daysUntilExpiry} days. Renew now to continue using all features.`;

      // Check if we already sent this notification today
      const today = now.toISOString().split('T')[0];
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('pharmacy_id', pharmacy.id)
        .eq('type', 'subscription_expiry')
        .gte('created_at', `${today}T00:00:00Z`)
        .maybeSingle();

      if (existingNotification) {
        console.log(`Notification already sent today for pharmacy ${pharmacy.id}`);
        continue;
      }

      // Insert in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          pharmacy_id: pharmacy.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'subscription_expiry',
          priority: daysUntilExpiry === 1 ? 'high' : 'medium',
          link: '/settings?tab=subscription',
        });

      if (notifError) {
        console.error(`Error creating notification for ${pharmacy.id}:`, notifError);
      }

      // Send SMS if Termii is configured and phone number exists
      if (termiiApiKey && pharmacy.phone) {
        let formattedPhone = pharmacy.phone.replace(/\s+/g, '').replace(/^[+]/, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '234' + formattedPhone.substring(1);
        }

        const senderId = pharmacy.termii_sender_id || 'PharmaTrack';
        
        const smsMessage = daysUntilExpiry === 1
          ? `🚨 ${pharmacy.name}: Your PharmaTrack subscription expires TOMORROW! Renew now to avoid losing access to your pharmacy data. Visit your settings to renew.`
          : `📅 ${pharmacy.name}: Your PharmaTrack ${pharmacy.subscription_plan} subscription expires in ${daysUntilExpiry} days. Renew now to continue managing your pharmacy seamlessly.`;

        try {
          const termiiResponse = await fetch(`${TERMII_BASE_URL}/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: termiiApiKey,
              to: formattedPhone,
              from: senderId.substring(0, 11).replace(/\s+/g, ''),
              sms: smsMessage,
              type: 'plain',
              channel: 'generic',
            }),
          });

          const termiiData = await termiiResponse.json();
          
          if (termiiResponse.ok && termiiData.code === 'ok') {
            console.log(`SMS sent to ${pharmacy.name} (${formattedPhone})`);
            
            // Log sent alert
            await supabase.from('sent_alerts').insert({
              pharmacy_id: pharmacy.id,
              alert_type: 'subscription_expiry',
              channel: 'sms',
              recipient_phone: formattedPhone,
              message: smsMessage,
              status: 'sent',
              termii_message_id: termiiData.message_id,
            });
          } else {
            console.error(`SMS failed for ${pharmacy.name}:`, termiiData);
          }
        } catch (smsError) {
          console.error(`SMS error for ${pharmacy.name}:`, smsError);
        }
      }

      results.push({
        pharmacy_id: pharmacy.id,
        pharmacy_name: pharmacy.name,
        days_until_expiry: daysUntilExpiry,
        notification_sent: true,
        sms_sent: !!termiiApiKey && !!pharmacy.phone,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in subscription-reminder function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
