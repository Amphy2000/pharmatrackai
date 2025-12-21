import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useMedications } from '@/hooks/useMedications';
import { differenceInDays, parseISO } from 'date-fns';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  time: string;
  isRead: boolean;
  link?: string;
}

export const useNotifications = () => {
  const { pharmacy } = usePharmacy();
  const { medications } = useMedications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    // Load read IDs from localStorage
    const stored = localStorage.getItem('readNotificationIds');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const generateNotifications = useCallback(() => {
    if (!pharmacy || !medications) return;

    const now = new Date();
    const generated: Notification[] = [];

    // Check for expired medications
    const expired = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      return expiryDate < now;
    });

    if (expired.length > 0) {
      generated.push({
        id: 'expired-meds',
        title: `${expired.length} medication${expired.length > 1 ? 's' : ''} expired`,
        message: `These items need to be removed from inventory.`,
        type: 'danger',
        time: 'Now',
        isRead: readIds.has('expired-meds'),
        link: '/inventory',
      });
    }

    // Check for expiring soon (within 30 days)
    const expiringSoon = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntil = differenceInDays(expiryDate, now);
      return daysUntil > 0 && daysUntil <= 30;
    });

    if (expiringSoon.length > 0) {
      generated.push({
        id: 'expiring-soon',
        title: `${expiringSoon.length} medication${expiringSoon.length > 1 ? 's' : ''} expiring soon`,
        message: 'Within the next 30 days. Consider running promotions.',
        type: 'warning',
        time: 'Today',
        isRead: readIds.has('expiring-soon'),
        link: '/inventory',
      });
    }

    // Check for low stock
    const lowStock = medications.filter(med => med.current_stock <= med.reorder_level);

    if (lowStock.length > 0) {
      generated.push({
        id: 'low-stock',
        title: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} low on stock`,
        message: lowStock.slice(0, 3).map(m => m.name).join(', ') + (lowStock.length > 3 ? '...' : ''),
        type: 'warning',
        time: 'Today',
        isRead: readIds.has('low-stock'),
        link: '/suppliers',
      });
    }

    // Check for out of stock
    const outOfStock = medications.filter(med => med.current_stock === 0);

    if (outOfStock.length > 0) {
      generated.push({
        id: 'out-of-stock',
        title: `${outOfStock.length} item${outOfStock.length > 1 ? 's' : ''} out of stock`,
        message: 'Urgent: Reorder needed immediately.',
        type: 'danger',
        time: 'Now',
        isRead: readIds.has('out-of-stock'),
        link: '/suppliers',
      });
    }

    // Welcome notification for new pharmacies
    if (medications.length === 0) {
      generated.push({
        id: 'welcome',
        title: 'Welcome to PharmaTrack!',
        message: 'Start by adding your first medication to the inventory.',
        type: 'info',
        time: 'Just now',
        isRead: readIds.has('welcome'),
        link: '/inventory',
      });
    }

    // AI analysis ready (if we have medications)
    if (medications.length >= 5) {
      generated.push({
        id: 'ai-ready',
        title: 'AI Insights Available',
        message: 'View demand forecasting and optimization recommendations.',
        type: 'success',
        time: 'Today',
        isRead: readIds.has('ai-ready'),
        link: '/',
      });
    }

    setNotifications(generated);
  }, [pharmacy, medications, readIds]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      localStorage.setItem('readNotificationIds', JSON.stringify([...newSet]));
      return newSet;
    });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => {
      const newSet = new Set([...prev, ...allIds]);
      localStorage.setItem('readNotificationIds', JSON.stringify([...newSet]));
      return newSet;
    });
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
