import { Medication } from '@/types/medication';
import { differenceInDays, parseISO, subDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';

export interface SaleRecord {
  id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  medication?: {
    name: string;
    category?: string;
  } | null;
}

export interface ReorderSuggestion {
  medicationId: string;
  medicationName: string;
  currentStock: number;
  reorderLevel: number;
  avgDailyConsumption: number;
  estimatedEmptyDays: number;
  suggestedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  costPrice?: number;
  supplierName?: string;
}

export interface ExpiryBucket {
  expired: (Medication & { daysUntilExpiry: number; valueAtRisk: number })[];
  within30Days: (Medication & { daysUntilExpiry: number; valueAtRisk: number })[];
  within60Days: (Medication & { daysUntilExpiry: number; valueAtRisk: number })[];
  within90Days: (Medication & { daysUntilExpiry: number; valueAtRisk: number })[];
  totalValueAtRisk: number;
}

export interface DashboardIntelligence {
  fastestSelling: { id: string; name: string; unitsSold: number; revenue: number }[];
  slowMoving: { id: string; name: string; stock: number; daysWithoutSale: number; valueTiedUp: number }[];
  todaySales: number;
  todayProfit: number;
  todayOrderCount: number;
  yesterdaySales: number;
  salesGrowthPercent: number;
  lowStockCount: number;
  expiryCount: number;
  topCategories: { category: string; count: number; revenue: number }[];
  insights: AutopilotInsight[];
}

export interface AutopilotInsight {
  id: string;
  type: 'stock' | 'expiry' | 'sales' | 'growth' | 'slow_moving';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  metric?: string;
  actionText?: string;
  actionRoute?: string;
  valueAmount?: number;
}

export class AutopilotEngine {

  /**
   * 1. Automatic Low Stock & Smart Reorder Calculations
   */
  static computeReorderSuggestions(
    medications: Medication[],
    sales: SaleRecord[] = [],
    lookbackDays: number = 30
  ): ReorderSuggestion[] {
    if (!medications || medications.length === 0) return [];

    const now = new Date();
    const cutoffDate = subDays(now, lookbackDays);

    // Group sales by medication_id for the last N days
    const salesByMed: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.medication_id && parseISO(sale.sale_date) >= cutoffDate) {
        salesByMed[sale.medication_id] = (salesByMed[sale.medication_id] || 0) + (sale.quantity || 0);
      }
    });

    const suggestions: ReorderSuggestion[] = [];

    medications.forEach(med => {
      const totalUnitsSold = salesByMed[med.id] || 0;
      const avgDailyConsumption = Number((totalUnitsSold / lookbackDays).toFixed(2));

      const isLowStock = med.current_stock <= med.reorder_level;
      const isOut = med.current_stock === 0;

      if (isLowStock || avgDailyConsumption > 0) {
        // Estimated days until stock hits 0
        const estimatedEmptyDays = avgDailyConsumption > 0 
          ? Math.ceil(med.current_stock / avgDailyConsumption)
          : (med.current_stock === 0 ? 0 : 999);

        // Standard reorder buffer: 14 days of average stock + reorder level deficit
        const targetStock = Math.max(med.reorder_level * 2, Math.ceil(avgDailyConsumption * 14));
        const suggestedQuantity = Math.max(0, targetStock - med.current_stock);

        let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (isOut) urgency = 'critical';
        else if (estimatedEmptyDays <= 3) urgency = 'high';
        else if (isLowStock) urgency = 'medium';

        if (isLowStock || (estimatedEmptyDays <= 7 && suggestedQuantity > 0)) {
          suggestions.push({
            medicationId: med.id,
            medicationName: med.name,
            currentStock: med.current_stock,
            reorderLevel: med.reorder_level,
            avgDailyConsumption,
            estimatedEmptyDays,
            suggestedQuantity: Math.max(suggestedQuantity, 10), // minimum batch order
            urgency,
            category: med.category,
            costPrice: med.cost_price || 0,
          });
        }
      }
    });

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    return suggestions.sort((a, b) => priorityRank[a.urgency] - priorityRank[b.urgency]);
  }

  /**
   * 2. Expiry Monitoring (90, 60, 30 days & expired)
   */
  static computeExpiryBuckets(medications: Medication[]): ExpiryBucket {
    const now = new Date();
    const result: ExpiryBucket = {
      expired: [],
      within30Days: [],
      within60Days: [],
      within90Days: [],
      totalValueAtRisk: 0,
    };

    if (!medications) return result;

    medications.forEach(med => {
      if (!med.expiry_date) return;
      const expiry = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiry, now);
      const unitPrice = med.selling_price || med.unit_price || 0;
      const valueAtRisk = unitPrice * med.current_stock;

      const itemWithMeta = { ...med, daysUntilExpiry, valueAtRisk };

      if (daysUntilExpiry <= 0) {
        result.expired.push(itemWithMeta);
        result.totalValueAtRisk += valueAtRisk;
      } else if (daysUntilExpiry <= 30) {
        result.within30Days.push(itemWithMeta);
        result.totalValueAtRisk += valueAtRisk;
      } else if (daysUntilExpiry <= 60) {
        result.within60Days.push(itemWithMeta);
      } else if (daysUntilExpiry <= 90) {
        result.within90Days.push(itemWithMeta);
      }
    });

    // Sort buckets by most urgent
    result.expired.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within30Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within60Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within90Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return result;
  }

  /**
   * 3. Dashboard Intelligence & Growth Metrics
   */
  static computeDashboardIntelligence(
    medications: Medication[] = [],
    sales: SaleRecord[] = []
  ): DashboardIntelligence {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const thirtyDaysAgo = subDays(now, 30);

    let todaySales = 0;
    let todayProfit = 0;
    const todayReceipts = new Set<string>();
    let yesterdaySales = 0;

    const salesByMed: Record<string, { qty: number; revenue: number; lastSaleDate: Date }> = {};
    const categoryRevenue: Record<string, { count: number; revenue: number }> = {};

    sales.forEach(sale => {
      const saleDate = parseISO(sale.sale_date);
      const qty = sale.quantity || 0;
      const total = sale.total_price || 0;
      const medId = sale.medication_id;
      const category = sale.medication?.category || 'General';

      // Today financial summary
      if (saleDate >= todayStart && saleDate <= todayEnd) {
        todaySales += total;
        // Estimated 25% margin if cost_price missing
        const unitCost = (sale.unit_price || 0) * 0.75;
        todayProfit += total - (unitCost * qty);
        todayReceipts.add(sale.id);
      }

      // Yesterday financial summary
      if (saleDate >= yesterdayStart && saleDate <= yesterdayEnd) {
        yesterdaySales += total;
      }

      // Aggregations over last 30 days
      if (saleDate >= thirtyDaysAgo && medId) {
        if (!salesByMed[medId]) {
          salesByMed[medId] = { qty: 0, revenue: 0, lastSaleDate: saleDate };
        }
        salesByMed[medId].qty += qty;
        salesByMed[medId].revenue += total;
        if (saleDate > salesByMed[medId].lastSaleDate) {
          salesByMed[medId].lastSaleDate = saleDate;
        }

        // Category breakdown
        if (!categoryRevenue[category]) categoryRevenue[category] = { count: 0, revenue: 0 };
        categoryRevenue[category].count += qty;
        categoryRevenue[category].revenue += total;
      }
    });

    // Fastest selling medicines
    const fastestSelling = Object.entries(salesByMed)
      .map(([medId, data]) => {
        const med = medications.find(m => m.id === medId);
        return {
          id: medId,
          name: med?.name || 'Medication',
          unitsSold: data.qty,
          revenue: data.revenue,
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    // Slow moving medicines (has stock > 10, but 0 sales in 30 days)
    const slowMoving = medications
      .filter(m => m.current_stock > 10 && (!salesByMed[m.id] || salesByMed[m.id].qty === 0))
      .map(m => ({
        id: m.id,
        name: m.name,
        stock: m.current_stock,
        daysWithoutSale: 30,
        valueTiedUp: (m.selling_price || m.unit_price || 0) * m.current_stock,
      }))
      .sort((a, b) => b.valueTiedUp - a.valueTiedUp)
      .slice(0, 5);

    // Growth calculation
    const salesGrowthPercent = yesterdaySales > 0
      ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
      : (todaySales > 0 ? 100 : 0);

    // Stock counts
    const expiryBuckets = this.computeExpiryBuckets(medications);
    const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;

    // Top categories
    const topCategories = Object.entries(categoryRevenue)
      .map(([cat, val]) => ({ category: cat, count: val.count, revenue: val.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Generate actionable insight cards
    const insights: AutopilotInsight[] = [];

    if (expiryBuckets.expired.length > 0) {
      insights.push({
        id: 'expired-stock-alert',
        type: 'expiry',
        priority: 'high',
        title: 'Expired Stock Action Required',
        message: `${expiryBuckets.expired.length} medication(s) have expired (${expiryBuckets.expired[0].name}). Unshelve immediately to comply with PCN regulations.`,
        valueAmount: expiryBuckets.expired.reduce((sum, item) => sum + item.valueAtRisk, 0),
        actionText: 'Unshelve Expired Stock',
        actionRoute: '/inventory?filter=expired',
      });
    }

    if (expiryBuckets.within30Days.length > 0) {
      insights.push({
        id: 'expiring-30-days',
        type: 'expiry',
        priority: 'medium',
        title: 'Expiring This Month',
        message: `${expiryBuckets.within30Days.length} product(s) expire within 30 days. Apply 25% discount to accelerate sales before loss.`,
        valueAmount: expiryBuckets.within30Days.reduce((sum, item) => sum + item.valueAtRisk, 0),
        actionText: 'Set Clearance Discount',
        actionRoute: '/inventory?filter=expiring',
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        id: 'low-stock-alert',
        type: 'stock',
        priority: 'high',
        title: 'Low Stock Replenishment',
        message: `${lowStockCount} item(s) are below minimum reorder thresholds. Order now to prevent stockouts.`,
        actionText: 'View Reorder List',
        actionRoute: '/inventory?filter=low-stock',
      });
    }

    if (salesGrowthPercent !== 0) {
      insights.push({
        id: 'sales-growth-insight',
        type: 'growth',
        priority: 'low',
        title: salesGrowthPercent > 0 ? '📈 Daily Revenue Up' : '📊 Revenue Trend',
        message: salesGrowthPercent > 0
          ? `You sold ${salesGrowthPercent}% more today compared to yesterday!`
          : `Daily revenue is ${Math.abs(salesGrowthPercent)}% below yesterday's benchmark.`,
        metric: `${salesGrowthPercent > 0 ? '+' : ''}${salesGrowthPercent}%`,
        actionText: 'View Sales History',
        actionRoute: '/sales',
      });
    }

    if (slowMoving.length > 0) {
      insights.push({
        id: 'slow-moving-insight',
        type: 'slow_moving',
        priority: 'low',
        title: 'Capital Tied in Slow Movers',
        message: `${slowMoving.length} slow-moving products have high stock with no sales in 30 days.`,
        valueAmount: slowMoving.reduce((sum, item) => sum + item.valueTiedUp, 0),
        actionText: 'Analyze Slow Movers',
        actionRoute: '/inventory',
      });
    }

    return {
      fastestSelling,
      slowMoving,
      todaySales,
      todayProfit: Math.max(0, todayProfit),
      todayOrderCount: todayReceipts.size,
      yesterdaySales,
      salesGrowthPercent,
      lowStockCount,
      expiryCount: expiryBuckets.expired.length + expiryBuckets.within30Days.length,
      topCategories,
      insights,
    };
  }
}
