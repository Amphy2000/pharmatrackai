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

export interface DailyBriefing {
  greeting: string;
  expiringCount30Days: number;
  lowStockCount: number;
  yesterdaySalesChange: number;
  fastestSellingMedName: string;
  stagnantMedName?: string;
  stagnantDays?: number;
  recommendedActionText: string;
  recommendedActionBtnText: string;
  recommendedActionRoute: string;
}

export interface PriorityActionItem {
  id: string;
  priorityScore: number; // 0-100 score
  type: 'critical_out' | 'expired' | 'critical_expiry' | 'low_stock' | 'fast_mover_risk' | 'slow_moving';
  title: string;
  medName: string;
  medId: string;
  reason: string;
  recommendedAction: string;
  btnLabel: string;
  actionRoute: string;
  valueImpact?: number;
}

/**
 * Phase 2.1 — Smart Purchase Order Draft
 * A pre-built supplier order prepared automatically by the Autopilot Engine.
 * The pharmacist only needs to review and approve — never calculate from scratch.
 */
export interface PurchaseOrderLineItem {
  medicationId: string;
  medicationName: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  costPrice: number;
  lineTotalCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  avgDailyConsumption: number;
  /** How many days the restocked quantity will last at current consumption rate */
  daysOfStockAfterReorder: number;
  supplierHint?: string;
}

export interface PurchaseOrderDraft {
  /** ISO timestamp when this draft was generated */
  generatedAt: string;
  lineItems: PurchaseOrderLineItem[];
  totalItems: number;
  totalEstimatedCost: number;
  /** Human-readable note about what triggered this draft */
  summary: string;
  /** Urgency of the overall order */
  overallUrgency: 'critical' | 'high' | 'medium' | 'low';
  /** How many items are critically out of stock */
  criticalCount: number;
  /** How many items are just low but not yet out */
  lowStockCount: number;
}

/**
 * Phase 2.2 — Automatic Clearance Queue
 * Pre-calculates clearance discount recommendations for medicines approaching expiry.
 * Pharmacists review and approve — prices are never changed automatically.
 */
export interface ClearanceQueueItem {
  medicationId: string;
  medicationName: string;
  category: string;
  batchNumber?: string;
  expiryDate: string;
  daysUntilExpiry: number;
  currentStock: number;
  originalPrice: number;
  recommendedDiscountPercent: number;
  discountedPrice: number;
  valueAtRisk: number;
  potentialRecovery: number;
  urgency: 'critical' | 'urgent' | 'warning' | 'notice';
}

export interface ClearanceQueueSummary {
  generatedAt: string;
  items: ClearanceQueueItem[];
  totalItems: number;
  totalValueAtRisk: number;
  totalPotentialRecovery: number;
  criticalCount: number; // <= 7 days
  urgentCount: number;   // 8-30 days
  warningCount: number;  // 31-60 days
  noticeCount: number;   // 61-90 days
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
        const estimatedEmptyDays = avgDailyConsumption > 0 
          ? Math.ceil(med.current_stock / avgDailyConsumption)
          : (med.current_stock === 0 ? 0 : 999);

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
            suggestedQuantity: Math.max(suggestedQuantity, 10),
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

    result.expired.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within30Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within60Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    result.within90Days.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return result;
  }

  /**
   * 3. Priority Scoring System (0-100)
   */
  static computePrioritizedActions(
    medications: Medication[] = [],
    sales: SaleRecord[] = []
  ): PriorityActionItem[] {
    const items: PriorityActionItem[] = [];
    const expiry = this.computeExpiryBuckets(medications);
    const reorders = this.computeReorderSuggestions(medications, sales);

    // 100: Completely out of stock
    medications.filter(m => m.current_stock === 0).forEach(m => {
      items.push({
        id: `crit-out-${m.id}`,
        priorityScore: 100,
        type: 'critical_out',
        title: 'Critical Out of Stock',
        medName: m.name,
        medId: m.id,
        reason: `${m.name} has 0 units left. Patients are being turned away.`,
        recommendedAction: `Create urgent purchase order for ${m.reorder_level * 3 || 30} units.`,
        btnLabel: 'Restock Now',
        actionRoute: `/inventory?filter=outofstock`,
      });
    });

    // 95: Expired items still on shelf
    expiry.expired.forEach(m => {
      items.push({
        id: `expired-${m.id}`,
        priorityScore: 95,
        type: 'expired',
        title: 'Expired Stock Action Needed',
        medName: m.name,
        medId: m.id,
        reason: `Expired on ${new Date(m.expiry_date).toLocaleDateString()}. Unshelve to comply with PCN regulations.`,
        recommendedAction: 'Log for disposal and clear from active inventory.',
        btnLabel: 'Unshelve Item',
        actionRoute: `/inventory?filter=expired`,
        valueImpact: m.valueAtRisk,
      });
    });

    // 92: Expiring in <= 7 days
    expiry.within30Days.filter(m => m.daysUntilExpiry <= 7).forEach(m => {
      items.push({
        id: `crit-exp-${m.id}`,
        priorityScore: 92,
        type: 'critical_expiry',
        title: 'Expiring This Week',
        medName: m.name,
        medId: m.id,
        reason: `Expires in ${m.daysUntilExpiry} days. ${m.current_stock} units left on shelf.`,
        recommendedAction: 'Apply 35% clearance discount immediately.',
        btnLabel: 'Discount',
        actionRoute: `/inventory?filter=expiring`,
        valueImpact: m.valueAtRisk,
      });
    });

    // 81: Low stock below minimum threshold
    reorders.filter(r => r.currentStock > 0 && r.currentStock <= r.reorderLevel).forEach(r => {
      items.push({
        id: `low-stock-${r.medicationId}`,
        priorityScore: 81,
        type: 'low_stock',
        title: 'Low Stock Replenishment',
        medName: r.medicationName,
        medId: r.medicationId,
        reason: `Only ${r.currentStock} units left (below minimum reorder level of ${r.reorderLevel}).`,
        recommendedAction: `Order ${r.suggestedQuantity} units from supplier.`,
        btnLabel: 'Restock',
        actionRoute: `/inventory?filter=low-stock`,
      });
    });

    // 78: Fast mover running empty soon (empty in <= 5 days)
    reorders.filter(r => r.estimatedEmptyDays <= 5 && r.currentStock > r.reorderLevel).forEach(r => {
      items.push({
        id: `fast-risk-${r.medicationId}`,
        priorityScore: 78,
        type: 'fast_mover_risk',
        title: 'Fast Mover Depletion Risk',
        medName: r.medicationName,
        medId: r.medicationId,
        reason: `High daily demand (${r.avgDailyConsumption} units/day). Runs empty in ~${r.estimatedEmptyDays} days.`,
        recommendedAction: `Pre-order ${r.suggestedQuantity} units now to prevent stockout.`,
        btnLabel: 'Review Order',
        actionRoute: `/inventory?filter=low-stock`,
      });
    });

    // Sort descending by priority score
    return items.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6);
  }

  /**
   * 4. Daily Briefing Card Generator
   */
  static computeDailyBriefing(
    medications: Medication[] = [],
    sales: SaleRecord[] = []
  ): DailyBriefing {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const expiryBuckets = this.computeExpiryBuckets(medications);
    const intel = this.computeDashboardIntelligence(medications, sales);

    const expiringCount30Days = expiryBuckets.expired.length + expiryBuckets.within30Days.length;
    const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;
    const yesterdaySalesChange = intel.salesGrowthPercent;

    const fastestSellingMedName = intel.fastestSelling[0]?.name || 'Paracetamol 500mg';

    // Find stagnant medicine (highest stock with no sale in 30+ days)
    const stagnant = intel.slowMoving[0];
    const stagnantMedName = stagnant?.name;
    const stagnantDays = stagnant?.daysWithoutSale || 42;

    // Determine recommended first action
    let recommendedActionText = 'Review low-stock medicines to prevent lost sales.';
    let recommendedActionBtnText = 'Review Low Stock';
    let recommendedActionRoute = '/inventory?filter=low-stock';

    if (expiryBuckets.expired.length > 0) {
      recommendedActionText = `Unshelve ${expiryBuckets.expired.length} expired medicine(s) immediately for compliance.`;
      recommendedActionBtnText = 'Clear Expired Stock';
      recommendedActionRoute = '/inventory?filter=expired';
    } else if (lowStockCount > 0) {
      recommendedActionText = `Restock ${lowStockCount} item(s) currently below reorder levels.`;
      recommendedActionBtnText = 'Restock Items';
      recommendedActionRoute = '/inventory?filter=low-stock';
    } else if (expiryBuckets.within30Days.length > 0) {
      recommendedActionText = `Set clearance discount on ${expiryBuckets.within30Days.length} items expiring this month.`;
      recommendedActionBtnText = 'Set Discount';
      recommendedActionRoute = '/inventory?filter=expiring';
    }

    return {
      greeting,
      expiringCount30Days,
      lowStockCount,
      yesterdaySalesChange,
      fastestSellingMedName,
      stagnantMedName,
      stagnantDays,
      recommendedActionText,
      recommendedActionBtnText,
      recommendedActionRoute,
    };
  }

  /**
   * 5. Dashboard Intelligence & Growth Metrics
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

      if (saleDate >= todayStart && saleDate <= todayEnd) {
        todaySales += total;
        const unitCost = (sale.unit_price || 0) * 0.75;
        todayProfit += total - (unitCost * qty);
        todayReceipts.add(sale.id);
      }

      if (saleDate >= yesterdayStart && saleDate <= yesterdayEnd) {
        yesterdaySales += total;
      }

      if (saleDate >= thirtyDaysAgo && medId) {
        if (!salesByMed[medId]) {
          salesByMed[medId] = { qty: 0, revenue: 0, lastSaleDate: saleDate };
        }
        salesByMed[medId].qty += qty;
        salesByMed[medId].revenue += total;
        if (saleDate > salesByMed[medId].lastSaleDate) {
          salesByMed[medId].lastSaleDate = saleDate;
        }

        if (!categoryRevenue[category]) categoryRevenue[category] = { count: 0, revenue: 0 };
        categoryRevenue[category].count += qty;
        categoryRevenue[category].revenue += total;
      }
    });

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

    const salesGrowthPercent = yesterdaySales > 0
      ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
      : (todaySales > 0 ? 100 : 0);

    const expiryBuckets = this.computeExpiryBuckets(medications);
    const lowStockCount = medications.filter(m => m.current_stock <= m.reorder_level).length;

    const topCategories = Object.entries(categoryRevenue)
      .map(([cat, val]) => ({ category: cat, count: val.count, revenue: val.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

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

  /**
   * 6. Smart Purchase Order Draft (Phase 2.1)
   *
   * Automatically prepares a supplier purchase draft from low-stock medicines.
   * Groups by urgency, calculates quantities, estimates total cost and post-reorder
   * stock duration. The pharmacist reviews and approves — never calculates manually.
   */
  static computePurchaseOrderDraft(
    medications: Medication[],
    sales: SaleRecord[] = [],
    lookbackDays: number = 30
  ): PurchaseOrderDraft {
    const suggestions = this.computeReorderSuggestions(medications, sales, lookbackDays);

    const lineItems: PurchaseOrderLineItem[] = suggestions.map(sug => {
      const med = medications.find(m => m.id === sug.medicationId);
      const costPrice = sug.costPrice ?? (med?.unit_price ?? 0);
      const lineTotalCost = costPrice * sug.suggestedQuantity;

      // After restocking, how many days will stock last?
      const totalStockAfterReorder = sug.currentStock + sug.suggestedQuantity;
      const daysOfStockAfterReorder =
        sug.avgDailyConsumption > 0
          ? Math.round(totalStockAfterReorder / sug.avgDailyConsumption)
          : 999;

      return {
        medicationId: sug.medicationId,
        medicationName: sug.medicationName,
        category: sug.category ?? 'General',
        currentStock: sug.currentStock,
        reorderLevel: sug.reorderLevel,
        suggestedQuantity: sug.suggestedQuantity,
        costPrice,
        lineTotalCost,
        urgency: sug.urgency,
        avgDailyConsumption: sug.avgDailyConsumption,
        daysOfStockAfterReorder,
        supplierHint: med?.supplier ?? undefined,
      };
    });

    const totalEstimatedCost = lineItems.reduce((sum, item) => sum + item.lineTotalCost, 0);
    const criticalCount = lineItems.filter(i => i.urgency === 'critical').length;
    const lowStockCount = lineItems.filter(i => i.urgency !== 'critical').length;

    let overallUrgency: PurchaseOrderDraft['overallUrgency'] = 'low';
    if (criticalCount > 0) overallUrgency = 'critical';
    else if (lineItems.some(i => i.urgency === 'high')) overallUrgency = 'high';
    else if (lineItems.some(i => i.urgency === 'medium')) overallUrgency = 'medium';

    let summary = 'All stock levels are healthy. No purchase order required at this time.';
    if (lineItems.length > 0) {
      const parts: string[] = [];
      if (criticalCount > 0) parts.push(`${criticalCount} item${criticalCount > 1 ? 's' : ''} out of stock`);
      if (lowStockCount > 0) parts.push(`${lowStockCount} item${lowStockCount > 1 ? 's' : ''} below reorder level`);
      summary = `Draft prepared: ${parts.join(', ')}. Total estimated cost: ₦${totalEstimatedCost.toLocaleString()}.`;
    }

    return {
      generatedAt: new Date().toISOString(),
      lineItems,
      totalItems: lineItems.length,
      totalEstimatedCost,
      summary,
      overallUrgency,
      criticalCount,
      lowStockCount,
    };
  }

  /**
   * 7. Automatic Clearance Queue (Phase 2.2)
   *
   * Automatically groups medicines approaching expiry (<= 90 days) into a clearance queue.
   * Calculates recommended clearance discount percentages based on urgency:
   *  - <= 7 days: 35% discount
   *  - 8-30 days: 25% discount
   *  - 31-60 days: 15% discount
   *  - 61-90 days: 10% discount
   *
   * Estimates total inventory value at risk and potential revenue recovery.
   * Pharmacists review and approve — prices are never changed automatically.
   */
  static computeClearanceQueue(medications: Medication[]): ClearanceQueueSummary {
    const now = new Date();
    const items: ClearanceQueueItem[] = [];

    if (!medications || medications.length === 0) {
      return {
        generatedAt: now.toISOString(),
        items: [],
        totalItems: 0,
        totalValueAtRisk: 0,
        totalPotentialRecovery: 0,
        criticalCount: 0,
        urgentCount: 0,
        warningCount: 0,
        noticeCount: 0,
      };
    }

    medications.forEach(med => {
      if (!med.expiry_date || med.current_stock <= 0) return;
      const expiry = parseISO(med.expiry_date);
      const daysUntilExpiry = differenceInDays(expiry, now);

      // Only items that have not expired yet, but expire within 90 days
      if (daysUntilExpiry <= 0 || daysUntilExpiry > 90) return;

      let recommendedDiscountPercent = 10;
      let urgency: ClearanceQueueItem['urgency'] = 'notice';

      if (daysUntilExpiry <= 7) {
        recommendedDiscountPercent = 35;
        urgency = 'critical';
      } else if (daysUntilExpiry <= 30) {
        recommendedDiscountPercent = 25;
        urgency = 'urgent';
      } else if (daysUntilExpiry <= 60) {
        recommendedDiscountPercent = 15;
        urgency = 'warning';
      }

      const originalPrice = med.selling_price || med.unit_price || 0;
      const discountedPrice = Math.max(1, Math.round(originalPrice * (1 - recommendedDiscountPercent / 100)));
      const valueAtRisk = originalPrice * med.current_stock;
      const potentialRecovery = discountedPrice * med.current_stock;

      items.push({
        medicationId: med.id,
        medicationName: med.name,
        category: med.category || 'General',
        batchNumber: med.batch_number,
        expiryDate: med.expiry_date,
        daysUntilExpiry,
        currentStock: med.current_stock,
        originalPrice,
        recommendedDiscountPercent,
        discountedPrice,
        valueAtRisk,
        potentialRecovery,
        urgency,
      });
    });

    // Sort by days until expiry ascending (most urgent first)
    items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    const totalValueAtRisk = items.reduce((sum, item) => sum + item.valueAtRisk, 0);
    const totalPotentialRecovery = items.reduce((sum, item) => sum + item.potentialRecovery, 0);

    return {
      generatedAt: now.toISOString(),
      items,
      totalItems: items.length,
      totalValueAtRisk,
      totalPotentialRecovery,
      criticalCount: items.filter(i => i.urgency === 'critical').length,
      urgentCount: items.filter(i => i.urgency === 'urgent').length,
      warningCount: items.filter(i => i.urgency === 'warning').length,
      noticeCount: items.filter(i => i.urgency === 'notice').length,
    };
  }
}
