import { useMemo } from 'react';
import { useMedications } from '@/hooks/useMedications';
import { usePharmacy } from '@/hooks/usePharmacy';
import { differenceInDays, parseISO } from 'date-fns';

export interface SystemAlert {
  id: string;
  type: 'expiry' | 'low_stock' | 'out_of_stock';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  productName: string;
  productId: string;
  valueAtRisk?: number;
  currentStock?: number;
  expiryDate?: string;
  daysUntilExpiry?: number;
  suggestedAction?: string;
  suggestedDiscount?: number;
  estimatedEmptyDays?: number;
  suggestedReorderQty?: number;
}

export const useAlertEngine = () => {
  const { medications } = useMedications();
  const { pharmacy } = usePharmacy();

  const alerts = useMemo(() => {
    if (!medications) return [];

    const now = new Date();
    const generatedAlerts: SystemAlert[] = [];

    medications.forEach((med) => {
      const expiryDate = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, now);
      const price = med.selling_price || med.unit_price;
      const valueAtRisk = price * med.current_stock;

      // EXPIRY ALERTS
      if (daysUntilExpiry <= 0) {
        // Already expired - highest priority
        generatedAlerts.push({
          id: `expiry-${med.id}`,
          type: 'expiry',
          priority: 'high',
          title: '🚨 Expired Stock',
          message: `${med.name} has expired and must be removed from shelves immediately.`,
          productName: med.name,
          productId: med.id,
          valueAtRisk,
          expiryDate: med.expiry_date,
          daysUntilExpiry,
          suggestedAction: 'Remove from inventory immediately. Log for disposal.',
        });
      } else if (daysUntilExpiry <= 7) {
        // Expires within 7 days - high priority
        generatedAlerts.push({
          id: `expiry-${med.id}`,
          type: 'expiry',
          priority: 'high',
          title: '🚨 Expiring This Week',
          message: `${med.name} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Apply discount to clear stock.`,
          productName: med.name,
          productId: med.id,
          valueAtRisk,
          expiryDate: med.expiry_date,
          daysUntilExpiry,
          suggestedAction: 'Apply a 30-40% discount immediately to clear before expiry.',
          suggestedDiscount: 35,
        });
      } else if (daysUntilExpiry <= 30) {
        // Expires within 30 days - medium priority
        generatedAlerts.push({
          id: `expiry-${med.id}`,
          type: 'expiry',
          priority: 'medium',
          title: '⚠️ Expiring Soon',
          message: `${med.name} expires in ${daysUntilExpiry} days. Consider promotional pricing.`,
          productName: med.name,
          productId: med.id,
          valueAtRisk,
          expiryDate: med.expiry_date,
          daysUntilExpiry,
          suggestedAction: 'Apply a 20% discount to encourage sales.',
          suggestedDiscount: 20,
        });
      } else if (daysUntilExpiry <= 60) {
        // Expires within 60 days - low priority
        generatedAlerts.push({
          id: `expiry-${med.id}`,
          type: 'expiry',
          priority: 'low',
          title: 'Expiry Watch',
          message: `${med.name} will expire in ${daysUntilExpiry} days. Monitor sales velocity.`,
          productName: med.name,
          productId: med.id,
          valueAtRisk,
          expiryDate: med.expiry_date,
          daysUntilExpiry,
          suggestedAction: 'Keep on watchlist. Consider 10% discount if stock is high.',
          suggestedDiscount: 10,
        });
      }

      // LOW STOCK ALERTS
      if (med.current_stock === 0) {
        // Out of stock - high priority
        generatedAlerts.push({
          id: `stock-${med.id}`,
          type: 'out_of_stock',
          priority: 'high',
          title: '📉 Out of Stock',
          message: `${med.name} is completely out of stock. Reorder immediately!`,
          productName: med.name,
          productId: med.id,
          currentStock: 0,
          suggestedAction: 'Create purchase order urgently.',
          suggestedReorderQty: med.reorder_level * 3,
          estimatedEmptyDays: 0,
        });
      } else if (med.current_stock <= med.reorder_level) {
        // Below reorder level
        const stockPercent = (med.current_stock / med.reorder_level) * 100;
        const priority = stockPercent <= 25 ? 'high' : stockPercent <= 50 ? 'medium' : 'low';
        
        // Estimate days until empty (rough: assume 2 units/day average)
        const estimatedEmptyDays = Math.ceil(med.current_stock / 2);

        generatedAlerts.push({
          id: `stock-${med.id}`,
          type: 'low_stock',
          priority,
          title: priority === 'high' ? '📉 Critical Low Stock' : '📊 Low Stock',
          message: `${med.name} has only ${med.current_stock} units left. Estimated empty in ${estimatedEmptyDays} days.`,
          productName: med.name,
          productId: med.id,
          currentStock: med.current_stock,
          suggestedAction: 'Create purchase order.',
          suggestedReorderQty: med.reorder_level * 2,
          estimatedEmptyDays,
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return generatedAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [medications]);

  const alertCounts = useMemo(() => {
    return {
      total: alerts.length,
      high: alerts.filter(a => a.priority === 'high').length,
      medium: alerts.filter(a => a.priority === 'medium').length,
      low: alerts.filter(a => a.priority === 'low').length,
      expiry: alerts.filter(a => a.type === 'expiry').length,
      lowStock: alerts.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock').length,
    };
  }, [alerts]);

  const generateWhatsAppMessage = (alert: SystemAlert, ownerPhone?: string): string => {
    const phone = ownerPhone || pharmacy?.phone || '';
    let message = '';

    if (alert.type === 'expiry') {
      message = `🚨 *PharmaTrack AI: Expiry Alert*

Boss, you have stock nearing expiry!

📦 *Product:* ${alert.productName}
🗓️ *Expiry Date:* ${alert.expiryDate ? new Date(alert.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} (${alert.daysUntilExpiry} days left)
💰 *Value at Risk:* ₦${alert.valueAtRisk?.toLocaleString() || '0'}

💡 *AI Suggestion:* Apply a ${alert.suggestedDiscount || 20}% Discount now to clear this stock before it's a total loss.`;
    } else {
      message = `📉 *PharmaTrack AI: Low Stock Alert*

You are running out of a fast-moving item!

📦 *Product:* ${alert.productName}
📊 *Current Stock:* ${alert.currentStock} units left
⏱️ *Estimated Empty In:* ${alert.estimatedEmptyDays} days

🛒 *Suggested Reorder:* ${alert.suggestedReorderQty} units`;
    }

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  // Generate bundled digest message for all alerts
  const generateDigestMessage = (alertList: SystemAlert[]): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });

    const expiryAlerts = alertList.filter(a => a.type === 'expiry');
    const stockAlerts = alertList.filter(a => a.type === 'low_stock' || a.type === 'out_of_stock');
    const totalValueAtRisk = expiryAlerts.reduce((sum, a) => sum + (a.valueAtRisk || 0), 0);

    let message = `📊 *PharmaTrack Daily Digest for ${dateStr}*\n\n`;
    
    if (expiryAlerts.length > 0) {
      message += `⚠️ *Expiring Items (${expiryAlerts.length})*\n`;
      expiryAlerts.forEach(a => {
        const daysText = (a.daysUntilExpiry || 0) <= 0 ? 'EXPIRED' : `${a.daysUntilExpiry}d left`;
        message += `• ${a.productName}: ${daysText} (₦${(a.valueAtRisk || 0).toLocaleString()})\n`;
      });
      message += '\n';
    }

    if (stockAlerts.length > 0) {
      message += `📉 *Low Stock Items (${stockAlerts.length})*\n`;
      stockAlerts.forEach(a => {
        const stockText = a.currentStock === 0 ? 'OUT OF STOCK' : `${a.currentStock} units`;
        message += `• ${a.productName}: ${stockText}\n`;
      });
      message += '\n';
    }

    message += `💰 *Total Value at Risk:* ₦${totalValueAtRisk.toLocaleString()}\n\n`;
    message += `📱 Log in to PharmaTrack to take action.`;

    return message;
  };

  const generateDigestWhatsAppUrl = (alertList: SystemAlert[], ownerPhone?: string): string => {
    const phone = ownerPhone || pharmacy?.phone || '';
    const message = generateDigestMessage(alertList);
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  };

  return {
    alerts,
    alertCounts,
    generateWhatsAppMessage,
    generateDigestMessage,
    generateDigestWhatsAppUrl,
  };
};
