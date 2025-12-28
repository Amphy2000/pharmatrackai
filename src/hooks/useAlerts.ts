import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { toast } from 'sonner';

type AlertType = 'low_stock' | 'expiring' | 'expired' | 'custom' | 'daily_summary';
type AlertChannel = 'sms' | 'whatsapp';

interface SendAlertParams {
  alertType: AlertType;
  message: string;
  recipientPhone?: string; // Optional - will use pharmacy alert_recipient_phone if not provided
  channel?: AlertChannel;  // Optional - will use pharmacy alert_channel if not provided
  itemName?: string;
  itemValue?: number;
  daysLeft?: number;
  currentStock?: number;
  suggestedReorder?: number;
}

interface AlertResult {
  success: boolean;
  error?: string;
  data?: any;
  messageId?: string;
  balance?: number;
}

export const useAlerts = () => {
  const [isSending, setIsSending] = useState(false);
  const { pharmacy } = usePharmacy();

  const getFunctionsErrorMessage = async (error: any) => {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        return body?.error || body?.message || error?.message || 'Failed to send alert';
      }
      if (ctx && typeof ctx.text === 'function') {
        const text = await ctx.text();
        return text || error?.message || 'Failed to send alert';
      }
    } catch {
      // ignore
    }
    return error?.message || 'Failed to send alert';
  };

  const sendAlert = async (params: SendAlertParams): Promise<AlertResult> => {
    if (!pharmacy?.id) {
      toast.error('Pharmacy not found');
      return { success: false, error: 'Pharmacy not found' };
    }

    // Use provided phone/channel or fall back to pharmacy settings
    const recipientPhone = params.recipientPhone || (pharmacy as any)?.alert_recipient_phone;
    const channel = params.channel || (pharmacy as any)?.alert_channel || 'sms';

    if (!recipientPhone) {
      toast.error('No alert phone number configured. Please set one in Settings > Alerts.');
      return { success: false, error: 'No alert phone number configured' };
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('termii-alert', {
        body: {
          pharmacyId: pharmacy.id,
          ...params,
          recipientPhone,
          channel,
        },
      });

      if (error) {
        console.error('Termii alert error:', error);
        const errorMessage = await getFunctionsErrorMessage(error);
        toast.error(`Failed to send: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      toast.success(`${params.channel.toUpperCase()} alert sent successfully!`, {
        description: data.balance !== undefined ? `Termii balance: ${data.balance}` : undefined,
      });
      return { 
        success: true, 
        data, 
        messageId: data.messageId,
        balance: data.balance 
      };
    } catch (err: any) {
      console.error('Alert exception:', err);
      const errorMessage = err?.message || 'Failed to send alert';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  };

  const sendLowStockAlert = async (
    items: { name: string; stock: number; reorderLevel?: number }[], 
    recipientPhone: string, 
    channel: AlertChannel
  ): Promise<AlertResult> => {
    if (items.length === 1) {
      const item = items[0];
      return sendAlert({
        alertType: 'low_stock',
        message: `${item.name} is running low: ${item.stock} units left`,
        recipientPhone,
        channel,
        itemName: item.name,
        currentStock: item.stock,
        suggestedReorder: Math.max(50, (item.reorderLevel || 20) * 3),
      });
    }

    const itemList = items.slice(0, 5).map(i => `• ${i.name}: ${i.stock} units`).join('\n');
    const message = `${items.length} items are running low on stock:\n\n${itemList}${items.length > 5 ? `\n\n...and ${items.length - 5} more` : ''}`;
    
    return sendAlert({ 
      alertType: 'low_stock', 
      message, 
      recipientPhone, 
      channel 
    });
  };

  const sendExpiryAlert = async (
    items: { name: string; expiryDate: string; value?: number; daysLeft?: number }[], 
    recipientPhone: string, 
    channel: AlertChannel
  ): Promise<AlertResult> => {
    if (items.length === 1) {
      const item = items[0];
      return sendAlert({
        alertType: 'expiring',
        message: `${item.name} expires ${item.expiryDate}`,
        recipientPhone,
        channel,
        itemName: item.name,
        itemValue: item.value,
        daysLeft: item.daysLeft,
      });
    }

    const itemList = items.slice(0, 5).map(i => `• ${i.name}: expires ${i.expiryDate}`).join('\n');
    const message = `${items.length} items are expiring soon:\n\n${itemList}${items.length > 5 ? `\n\n...and ${items.length - 5} more` : ''}`;
    
    return sendAlert({ 
      alertType: 'expiring', 
      message, 
      recipientPhone, 
      channel 
    });
  };

  const sendExpiredAlert = async (
    items: { name: string; value?: number }[], 
    recipientPhone: string, 
    channel: AlertChannel
  ): Promise<AlertResult> => {
    if (items.length === 1) {
      const item = items[0];
      return sendAlert({
        alertType: 'expired',
        message: `${item.name} has EXPIRED! Remove from shelves immediately.`,
        recipientPhone,
        channel,
        itemName: item.name,
        itemValue: item.value,
      });
    }

    const itemList = items.slice(0, 5).map(i => `• ${i.name}`).join('\n');
    const message = `🚨 URGENT: ${items.length} items have EXPIRED:\n\n${itemList}\n\nRemove from shelves immediately!`;
    
    return sendAlert({ 
      alertType: 'expired', 
      message, 
      recipientPhone, 
      channel 
    });
  };

  const sendDailySummary = async (
    summary: {
      todaySales: number;
      expiringCount: number;
      lowStockCount: number;
      protectedValue: number;
    },
    recipientPhone: string,
    channel: AlertChannel
  ): Promise<AlertResult> => {
    const message = `📊 Today's Summary:

💰 Sales: ₦${summary.todaySales.toLocaleString()}
🛡️ Value Protected: ₦${summary.protectedValue.toLocaleString()}
⚠️ Expiring Soon: ${summary.expiringCount} items
📉 Low Stock: ${summary.lowStockCount} items`;

    return sendAlert({
      alertType: 'daily_summary',
      message,
      recipientPhone,
      channel,
    });
  };

  // Helper to get current alert settings from pharmacy
  const getAlertSettings = () => ({
    phone: (pharmacy as any)?.alert_recipient_phone || null,
    channel: ((pharmacy as any)?.alert_channel || 'sms') as AlertChannel,
    hasSettings: !!(pharmacy as any)?.alert_recipient_phone,
  });

  return {
    sendAlert,
    sendLowStockAlert,
    sendExpiryAlert,
    sendExpiredAlert,
    sendDailySummary,
    getAlertSettings,
    isSending,
  };
};
