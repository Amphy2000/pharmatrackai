import { useState, useEffect, useCallback } from 'react';
import { useBranchInventory } from '@/hooks/useBranchInventory';
import { useBranchContext } from '@/contexts/BranchContext';
import { differenceInDays, parseISO } from 'date-fns';

export interface BranchNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  time: string;
  isRead: boolean;
  link?: string;
}

export const useBranchNotifications = () => {
  const { medications } = useBranchInventory();
  const { currentBranchId, currentBranchName } = useBranchContext();
  const [notifications, setNotifications] = useState<BranchNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    // Load read IDs from localStorage - branch-specific
    const stored = localStorage.getItem(`readNotificationIds_${currentBranchId || 'main'}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const generateNotifications = useCallback(() => {
    if (!medications || medications.length === 0) return;

    const now = new Date();
    const generated: BranchNotification[] = [];
    const branchSuffix = currentBranchName ? ` at ${currentBranchName}` : '';

    // Check for expired medications - branch-specific stock
    const expired = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      return expiryDate < now && med.branch_stock > 0;
    });

    if (expired.length > 0) {
      generated.push({
        id: `expired-meds-${currentBranchId || 'main'}`,
        title: `${expired.length} medication${expired.length > 1 ? 's' : ''} expired${branchSuffix}`,
        message: `These items need to be removed from inventory.`,
        type: 'danger',
        time: 'Now',
        isRead: readIds.has(`expired-meds-${currentBranchId || 'main'}`),
        link: '/inventory',
      });
    }

    // Check for expiring soon (within 30 days) - branch-specific stock
    const expiringSoon = medications.filter(med => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntil = differenceInDays(expiryDate, now);
      return daysUntil > 0 && daysUntil <= 30 && med.branch_stock > 0;
    });

    if (expiringSoon.length > 0) {
      generated.push({
        id: `expiring-soon-${currentBranchId || 'main'}`,
        title: `${expiringSoon.length} medication${expiringSoon.length > 1 ? 's' : ''} expiring soon${branchSuffix}`,
        message: 'Within the next 30 days. Consider running promotions.',
        type: 'warning',
        time: 'Today',
        isRead: readIds.has(`expiring-soon-${currentBranchId || 'main'}`),
        link: '/inventory',
      });
    }

    // Check for low stock - branch-specific
    const lowStock = medications.filter(med => 
      med.branch_stock > 0 && med.branch_stock <= med.branch_reorder_level
    );

    if (lowStock.length > 0) {
      generated.push({
        id: `low-stock-${currentBranchId || 'main'}`,
        title: `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} low on stock${branchSuffix}`,
        message: lowStock.slice(0, 3).map(m => m.name).join(', ') + (lowStock.length > 3 ? '...' : ''),
        type: 'warning',
        time: 'Today',
        isRead: readIds.has(`low-stock-${currentBranchId || 'main'}`),
        link: '/suppliers',
      });
    }

    // Check for out of stock - branch-specific items that have inventory records but 0 stock
    const outOfStock = medications.filter(med => 
      med.branch_stock === 0 && med.branch_inventory_id !== null
    );

    if (outOfStock.length > 0) {
      generated.push({
        id: `out-of-stock-${currentBranchId || 'main'}`,
        title: `${outOfStock.length} item${outOfStock.length > 1 ? 's' : ''} out of stock${branchSuffix}`,
        message: 'Urgent: Reorder or transfer needed.',
        type: 'danger',
        time: 'Now',
        isRead: readIds.has(`out-of-stock-${currentBranchId || 'main'}`),
        link: '/suppliers',
      });
    }

    // Branch welcome notification
    const branchStock = medications.filter(m => m.branch_stock > 0);
    if (branchStock.length === 0) {
      generated.push({
        id: `branch-welcome-${currentBranchId || 'main'}`,
        title: `No stock at ${currentBranchName || 'this branch'}`,
        message: 'Transfer stock from main branch or add new inventory.',
        type: 'info',
        time: 'Just now',
        isRead: readIds.has(`branch-welcome-${currentBranchId || 'main'}`),
        link: '/branches',
      });
    }

    setNotifications(generated);
  }, [medications, currentBranchId, currentBranchName, readIds]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  useEffect(() => {
    // Update localStorage key when branch changes
    const stored = localStorage.getItem(`readNotificationIds_${currentBranchId || 'main'}`);
    setReadIds(stored ? new Set(JSON.parse(stored)) : new Set());
  }, [currentBranchId]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      localStorage.setItem(`readNotificationIds_${currentBranchId || 'main'}`, JSON.stringify([...newSet]));
      return newSet;
    });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, [currentBranchId]);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => {
      const newSet = new Set([...prev, ...allIds]);
      localStorage.setItem(`readNotificationIds_${currentBranchId || 'main'}`, JSON.stringify([...newSet]));
      return newSet;
    });
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  }, [notifications, currentBranchId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
