import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { toast } from 'sonner';

type AlertType = 'low_stock' | 'expiring' | 'expired' | 'custom';
type AlertChannel = 'sms' | 'whatsapp';

interface SendAlertParams {
  alertType: AlertType;
  message: string;
  recipientPhone: string;
  channel: AlertChannel;
}

export const useAlerts = () => {
  const [isSending, setIsSending] = useState(false);
  const { pharmacy } = usePharmacy();

  const sendAlert = async ({ alertType, message, recipientPhone, channel }: SendAlertParams) => {
    if (!pharmacy?.id) {
      toast.error('Pharmacy not found');
      return { success: false, error: 'Pharmacy not found' };
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-alert', {
        body: {
          pharmacyId: pharmacy.id,
          alertType,
          message,
          recipientPhone,
          channel,
        },
      });

      if (error) {
        console.error('Alert error:', error);
        toast.error(`Failed to send ${channel.toUpperCase()} alert`);
        return { success: false, error: error.message };
      }

      toast.success(`${channel.toUpperCase()} alert sent successfully!`);
      return { success: true, data };
    } catch (err: any) {
      console.error('Alert exception:', err);
      toast.error('Failed to send alert');
      return { success: false, error: err.message };
    } finally {
      setIsSending(false);
    }
  };

  const sendLowStockAlert = async (items: { name: string; stock: number }[], recipientPhone: string, channel: AlertChannel) => {
    const itemList = items.slice(0, 5).map(i => `• ${i.name}: ${i.stock} units`).join('\n');
    const message = `${items.length} items are running low on stock:\n\n${itemList}${items.length > 5 ? `\n\n...and ${items.length - 5} more` : ''}`;
    return sendAlert({ alertType: 'low_stock', message, recipientPhone, channel });
  };

  const sendExpiryAlert = async (items: { name: string; expiryDate: string }[], recipientPhone: string, channel: AlertChannel) => {
    const itemList = items.slice(0, 5).map(i => `• ${i.name}: expires ${i.expiryDate}`).join('\n');
    const message = `${items.length} items are expiring soon:\n\n${itemList}${items.length > 5 ? `\n\n...and ${items.length - 5} more` : ''}`;
    return sendAlert({ alertType: 'expiring', message, recipientPhone, channel });
  };

  return {
    sendAlert,
    sendLowStockAlert,
    sendExpiryAlert,
    isSending,
  };
};
