import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';

export interface NotificationSettings {
  enabled: boolean;
  phone: string;
  channel: 'sms' | 'whatsapp';
  lowStockAlerts: boolean;
  expiryWarnings: boolean;
  dailySummary: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  phone: '',
  channel: 'whatsapp',
  lowStockAlerts: true,
  expiryWarnings: true,
  dailySummary: true,
};

export const useNotifications = () => {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notification-settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { currency } = useCurrency();

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem('notification-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const sendNotification = useCallback(async (
    type: 'low_stock' | 'expiry_warning' | 'daily_summary',
    pharmacyId: string,
    data: {
      medications?: Array<{ name: string; stock?: number; expiryDate?: string; daysUntilExpiry?: number }>;
      summary?: {
        totalSales: number;
        itemsSold: number;
        topProduct: string;
        currency: string;
      };
    }
  ) => {
    if (!settings.enabled || !settings.phone) {
      console.log('Notifications disabled or no phone number');
      return { success: false, error: 'Notifications not configured' };
    }

    // Check if this notification type is enabled
    if (type === 'low_stock' && !settings.lowStockAlerts) return { success: false };
    if (type === 'expiry_warning' && !settings.expiryWarnings) return { success: false };
    if (type === 'daily_summary' && !settings.dailySummary) return { success: false };

    setSending(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          type,
          pharmacyId,
          recipientPhone: settings.phone,
          channel: settings.channel,
          data,
        },
      });

      if (error) throw error;

      if (result?.success) {
        toast({
          title: 'Notification Sent',
          description: `${settings.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} notification sent successfully`,
        });
        return { success: true };
      } else {
        throw new Error(result?.error || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Notification error:', error);
      toast({
        title: 'Notification Failed',
        description: error.message || 'Could not send notification',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  }, [settings, toast]);

  const sendTestNotification = useCallback(async (pharmacyId: string) => {
    return sendNotification('daily_summary', pharmacyId, {
      summary: {
        totalSales: 15000,
        itemsSold: 42,
        topProduct: 'Paracetamol 500mg',
        currency: currency === 'NGN' ? '₦' : currency === 'GBP' ? '£' : '$',
      },
    });
  }, [sendNotification, currency]);

  return {
    settings,
    updateSettings,
    sendNotification,
    sendTestNotification,
    sending,
  };
};
