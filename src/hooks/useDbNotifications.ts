import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useToast } from '@/hooks/use-toast';

export interface DbNotification {
  id: string;
  pharmacy_id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  link?: string;
  metadata?: any;
  entity_type?: string | null;
  entity_id?: string;
  created_at: string;
}

export interface SentAlert {
  id: string;
  pharmacy_id: string;
  alert_type: string;
  channel: 'sms' | 'whatsapp';
  recipient_phone: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  termii_message_id?: string;
  items_included?: any;
  created_at: string;
}

export const useDbNotifications = () => {
  const { pharmacy } = usePharmacy();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [sentAlerts, setSentAlerts] = useState<SentAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []) as DbNotification[];

      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [pharmacy?.id]);

  // Fetch sent alerts history
  const fetchSentAlerts = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      const { data, error } = await supabase
        .from('sent_alerts')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSentAlerts((data || []) as SentAlert[]);
    } catch (error) {
      console.error('Error fetching sent alerts:', error);
    }
  }, [pharmacy?.id]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('pharmacy_id', pharmacy.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      toast({
        title: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [pharmacy?.id, toast]);

  // Create a new notification
  const createNotification = useCallback(async (notification: Omit<DbNotification, 'id' | 'created_at' | 'pharmacy_id' | 'is_read'>) => {
    if (!pharmacy?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          pharmacy_id: pharmacy.id,
          ...notification,
          is_read: false,
        });

      if (error) throw error;
      
      // Refresh notifications
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [pharmacy?.id, fetchNotifications]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('pharmacy_id', pharmacy.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      
      toast({
        title: 'All notifications cleared',
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [pharmacy?.id, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!pharmacy?.id) return;

    fetchNotifications();
    fetchSentAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `pharmacy_id=eq.${pharmacy.id}`,
        },
        (payload) => {
          const newNotification = {
            ...payload.new,
            type: payload.new.type as DbNotification['type'],
            priority: payload.new.priority as DbNotification['priority'],
          } as DbNotification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for high priority notifications
          if (newNotification.priority === 'high' || newNotification.priority === 'critical') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.type === 'danger' ? 'destructive' : 'default',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pharmacy?.id, fetchNotifications, fetchSentAlerts, toast]);

  // Generate notifications from current inventory state
  const generateInventoryNotifications = useCallback(async () => {
    if (!pharmacy?.id) return;

    try {
      // Call database functions to check and create notifications
      await supabase.rpc('check_and_create_expiry_notifications');
      await supabase.rpc('check_and_create_stock_notifications');
      
      // Refresh
      await fetchNotifications();
      
      toast({
        title: 'Notifications refreshed',
        description: 'Checked for new expiry and low stock alerts',
      });
    } catch (error) {
      console.error('Error generating notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh notifications',
        variant: 'destructive',
      });
    }
  }, [pharmacy?.id, fetchNotifications, toast]);

  return {
    notifications,
    sentAlerts,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    clearAll,
    fetchNotifications,
    fetchSentAlerts,
    generateInventoryNotifications,
  };
};
