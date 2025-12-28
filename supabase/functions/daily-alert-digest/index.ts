import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

interface MedicationAlert {
  id: string;
  name: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  selling_price: number;
  unit_price: number;
  pharmacy_id: string;
  last_notified_at: string | null;
}

interface PharmacyWithAlerts {
  id: string;
  name: string;
  phone: string | null;
  owner_id: string;
  expiryAlerts: MedicationAlert[];
  stockAlerts: MedicationAlert[];
  totalValueAtRisk: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting daily alert digest job...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const termiiApiKey = Deno.env.get('TERMII_API_KEY');

    if (!termiiApiKey) {
      console.error('TERMII_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Termii API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date for calculations
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all pharmacies with their alert settings
    const { data: pharmacies, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, phone, owner_id, termii_sender_id, alert_recipient_phone, alert_channel');

    if (pharmacyError) {
      console.error('Error fetching pharmacies:', pharmacyError);
      throw pharmacyError;
    }

    console.log(`Found ${pharmacies?.length || 0} pharmacies to process`);

    const results: { pharmacy: string; alerts: number; sent: boolean; error?: string }[] = [];

    for (const pharmacy of pharmacies || []) {
      try {
        // Use alert_recipient_phone if set, otherwise fall back to pharmacy phone
        const alertPhone = pharmacy.alert_recipient_phone || pharmacy.phone;
        const alertChannel = pharmacy.alert_channel || 'sms';
        
        // Skip if no phone number configured
        if (!alertPhone) {
          console.log(`Skipping pharmacy ${pharmacy.name} - no alert phone configured`);
          results.push({ pharmacy: pharmacy.name, alerts: 0, sent: false, error: 'No phone' });
          continue;
        }

        // Get expiring medications (within 30 days, not notified in 7 days unless critical)
        const { data: expiringMeds } = await supabaseAdmin
          .from('medications')
          .select('id, name, current_stock, reorder_level, expiry_date, selling_price, unit_price, last_notified_at')
          .eq('pharmacy_id', pharmacy.id)
          .eq('is_shelved', true)
          .gt('current_stock', 0)
          .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
          .or(`last_notified_at.is.null,last_notified_at.lt.${sevenDaysAgo.toISOString()}`);

        // Get low stock medications (stock <= reorder_level, not notified in 7 days unless 0 stock)
        const { data: lowStockMeds } = await supabaseAdmin
          .from('medications')
          .select('id, name, current_stock, reorder_level, expiry_date, selling_price, unit_price, last_notified_at')
          .eq('pharmacy_id', pharmacy.id)
          .eq('is_shelved', true)
          .or(`last_notified_at.is.null,last_notified_at.lt.${sevenDaysAgo.toISOString()},current_stock.eq.0`);

        // Filter low stock to only those at or below reorder level
        const filteredLowStock = (lowStockMeds || []).filter(
          med => med.current_stock <= med.reorder_level
        );

        const expiryAlerts = expiringMeds || [];
        const stockAlerts = filteredLowStock;

        // Calculate total value at risk
        const totalValueAtRisk = expiryAlerts.reduce((sum, med) => {
          const price = med.selling_price || med.unit_price;
          return sum + (price * med.current_stock);
        }, 0);

        const totalAlerts = expiryAlerts.length + stockAlerts.length;

        if (totalAlerts === 0) {
          console.log(`No alerts for pharmacy ${pharmacy.name}`);
          results.push({ pharmacy: pharmacy.name, alerts: 0, sent: false });
          continue;
        }

        // Count by priority
        const criticalExpiry = expiryAlerts.filter(m => {
          const daysLeft = Math.ceil((new Date(m.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysLeft <= 7;
        });
        const criticalStock = stockAlerts.filter(m => m.current_stock === 0);

        // Build digest message
        let message = `📊 *${pharmacy.name} Daily Alert Digest*\n\n`;
        message += `📅 Date: ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}\n\n`;

        if (expiryAlerts.length > 0) {
          message += `⚠️ *${expiryAlerts.length} Items Expiring Soon*\n`;
          // Show top 3 critical items
          const topExpiry = expiryAlerts.slice(0, 3);
          topExpiry.forEach(med => {
            const daysLeft = Math.ceil((new Date(med.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const value = (med.selling_price || med.unit_price) * med.current_stock;
            message += `• ${med.name}: ${daysLeft <= 0 ? 'EXPIRED' : daysLeft + ' days'} (₦${value.toLocaleString()})\n`;
          });
          if (expiryAlerts.length > 3) {
            message += `  ...and ${expiryAlerts.length - 3} more\n`;
          }
          message += '\n';
        }

        if (stockAlerts.length > 0) {
          message += `📉 *${stockAlerts.length} Items Low on Stock*\n`;
          // Show top 3 items
          const topStock = stockAlerts.slice(0, 3);
          topStock.forEach(med => {
            message += `• ${med.name}: ${med.current_stock} units left\n`;
          });
          if (stockAlerts.length > 3) {
            message += `  ...and ${stockAlerts.length - 3} more\n`;
          }
          message += '\n';
        }

        message += `💰 *Total Value at Risk:* ₦${totalValueAtRisk.toLocaleString()}\n\n`;

        if (criticalExpiry.length > 0 || criticalStock.length > 0) {
          message += `🚨 *URGENT:* ${criticalExpiry.length} items expire this week, ${criticalStock.length} out of stock!\n\n`;
        }

        message += `💡 *AI Tip:* Apply discounts to expiring items and reorder low stock to protect your profits.\n\n`;
        message += `📱 Open PharmaTrack to take action.`;

        // Format phone number - use the alert phone
        let formattedPhone = alertPhone.replace(/\s+/g, '').replace(/^[+]/, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '234' + formattedPhone.substring(1);
        }

        // Use configured sender ID or fallback to pharmacy name
        const senderId = pharmacy.termii_sender_id || pharmacy.name.substring(0, 11).replace(/\s+/g, '');

        console.log(`Sending digest to ${pharmacy.name} (${formattedPhone}) via ${alertChannel} with sender ID "${senderId}": ${totalAlerts} alerts`);

        // Prefer the configured channel
        const preferWhatsApp = alertChannel === 'whatsapp';
        const whatsappDeviceId = Deno.env.get('TERMII_WHATSAPP_DEVICE_ID');
        let messageSent = false;
        
        if (preferWhatsApp && whatsappDeviceId) {
          const termiiResponse = await fetch(`${TERMII_BASE_URL}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: termiiApiKey,
              to: formattedPhone,
              from: senderId,
              sms: message,
              type: 'plain',
              channel: 'whatsapp',
              device_id: whatsappDeviceId,
            }),
          });

          const termiiData = await termiiResponse.json();

          if (termiiResponse.ok && (!termiiData.code || termiiData.code === 'ok')) {
            // Log WhatsApp sent alert
            await supabaseAdmin.from('sent_alerts').insert({
              pharmacy_id: pharmacy.id,
              alert_type: 'daily_digest',
              channel: 'whatsapp',
              recipient_phone: formattedPhone,
              message: message,
              status: 'sent',
              termii_message_id: termiiData.message_id,
              items_included: [...expiryAlerts.map(m => m.id), ...stockAlerts.map(m => m.id)],
            });
            messageSent = true;
            results.push({ pharmacy: pharmacy.name, alerts: totalAlerts, sent: true });
          } else {
            console.error(`Termii WhatsApp error for ${pharmacy.name}:`, termiiData);
          }
        }

        // Fallback to SMS if WhatsApp failed or no device ID
        if (!messageSent) {
          console.log(`Trying SMS fallback for ${pharmacy.name}...`);
          const smsResponse = await fetch(`${TERMII_BASE_URL}/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: termiiApiKey,
              to: formattedPhone,
              from: senderId,
              sms: message.substring(0, 900), // SMS character limit
              type: 'plain',
              channel: 'generic',
            }),
          });

          const smsData = await smsResponse.json();
          
          if (!smsResponse.ok) {
            results.push({ pharmacy: pharmacy.name, alerts: totalAlerts, sent: false, error: 'Both channels failed' });
            continue;
          }

          // Log SMS sent alert
          await supabaseAdmin.from('sent_alerts').insert({
            pharmacy_id: pharmacy.id,
            alert_type: 'daily_digest',
            channel: 'sms',
            recipient_phone: formattedPhone,
            message: message.substring(0, 900),
            status: 'sent',
            termii_message_id: smsData.message_id,
            items_included: [...expiryAlerts.map(m => m.id), ...stockAlerts.map(m => m.id)],
          });

          results.push({ pharmacy: pharmacy.name, alerts: totalAlerts, sent: true });
        }

        // Update last_notified_at for all included medications
        const allMedIds = [...expiryAlerts.map(m => m.id), ...stockAlerts.map(m => m.id)];
        if (allMedIds.length > 0) {
          await supabaseAdmin
            .from('medications')
            .update({ last_notified_at: now.toISOString() })
            .in('id', allMedIds);
        }

        // Also create in-app notifications
        const notifications = [];
        
        if (expiryAlerts.length > 0) {
          notifications.push({
            pharmacy_id: pharmacy.id,
            title: `${expiryAlerts.length} items expiring soon`,
            message: `Total value at risk: ₦${totalValueAtRisk.toLocaleString()}`,
            type: criticalExpiry.length > 0 ? 'danger' : 'warning',
            priority: criticalExpiry.length > 0 ? 'high' : 'medium',
            link: '/inventory',
            metadata: { expiry_count: expiryAlerts.length, value: totalValueAtRisk },
          });
        }

        if (stockAlerts.length > 0) {
          notifications.push({
            pharmacy_id: pharmacy.id,
            title: `${stockAlerts.length} items low on stock`,
            message: criticalStock.length > 0 ? `${criticalStock.length} items are completely out!` : 'Reorder soon to avoid stockouts',
            type: criticalStock.length > 0 ? 'danger' : 'warning',
            priority: criticalStock.length > 0 ? 'critical' : 'medium',
            link: '/suppliers',
            metadata: { low_stock_count: stockAlerts.length, out_of_stock: criticalStock.length },
          });
        }

        if (notifications.length > 0) {
          await supabaseAdmin.from('notifications').insert(notifications);
        }

      } catch (pharmacyError) {
        console.error(`Error processing pharmacy ${pharmacy.name}:`, pharmacyError);
        results.push({ 
          pharmacy: pharmacy.name, 
          alerts: 0, 
          sent: false, 
          error: pharmacyError instanceof Error ? pharmacyError.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.sent).length;
    console.log(`Daily digest complete. Sent to ${successCount}/${pharmacies?.length || 0} pharmacies`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: pharmacies?.length || 0,
        sent: successCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in daily-alert-digest:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
