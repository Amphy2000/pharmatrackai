import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { AutopilotEngine, ReorderSuggestion, ExpiryBucket, DashboardIntelligence, DailyBriefing, PriorityActionItem, PurchaseOrderDraft, ClearanceQueueSummary, DailyClosingReport } from '@/services/autopilotEngine';
import { supabase } from '@/lib/supabase';

const AUTOPILOT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes background check
const WORKFLOW_MEMORY_KEY = 'pharmatrack_workflow_memory';

export function useAutopilotEngine() {
  const { medications, isLoading: medsLoading } = useMedications();
  const { sales, isLoading: salesLoading } = useSales();
  const { pharmacy } = usePharmacy();
  const { notifications, fetchNotifications } = useDbNotifications();
  const lastSyncRef = useRef<number>(0);

  // 1. Workflow Memory: Record user interaction history in localStorage
  const recordActionClick = useCallback((actionRoute: string) => {
    try {
      const stored = localStorage.getItem(WORKFLOW_MEMORY_KEY);
      const memory: Record<string, number> = stored ? JSON.parse(stored) : {};
      memory[actionRoute] = (memory[actionRoute] || 0) + 1;
      localStorage.setItem(WORKFLOW_MEMORY_KEY, JSON.stringify(memory));
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const getWorkflowMemory = useCallback((): Record<string, number> => {
    try {
      const stored = localStorage.getItem(WORKFLOW_MEMORY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // 2. Compute Smart Reorder Suggestions
  const reorderSuggestions: ReorderSuggestion[] = useMemo(() => {
    if (!medications) return [];
    return AutopilotEngine.computeReorderSuggestions(medications, sales || []);
  }, [medications, sales]);

  // 3. Compute Expiry Buckets
  const expiryBuckets: ExpiryBucket = useMemo(() => {
    if (!medications) return { expired: [], within30Days: [], within60Days: [], within90Days: [], totalValueAtRisk: 0 };
    return AutopilotEngine.computeExpiryBuckets(medications);
  }, [medications]);

  // 4. Compute Dashboard Intelligence
  const intelligence: DashboardIntelligence = useMemo(() => {
    return AutopilotEngine.computeDashboardIntelligence(medications || [], sales || []);
  }, [medications, sales]);

  // 5. Compute Daily Briefing
  const dailyBriefing: DailyBriefing = useMemo(() => {
    return AutopilotEngine.computeDailyBriefing(medications || [], sales || []);
  }, [medications, sales]);

  // 5b. Compute Smart Purchase Order Draft (Phase 2.1)
  const purchaseDraft: PurchaseOrderDraft = useMemo(() => {
    return AutopilotEngine.computePurchaseOrderDraft(medications || [], sales || []);
  }, [medications, sales]);

  // 5c. Compute Automatic Clearance Queue (Phase 2.2)
  const clearanceQueue: ClearanceQueueSummary = useMemo(() => {
    return AutopilotEngine.computeClearanceQueue(medications || []);
  }, [medications]);

  // 5d. Compute Automatic Daily Closing Report (Phase 2.4)
  const closingReport: DailyClosingReport = useMemo(() => {
    return AutopilotEngine.computeDailyClosingReport(medications || [], sales || []);
  }, [medications, sales]);

  // 6. Compute Today's Priorities (Ranked by 0-100 Priority Score + Workflow Memory Weight)
  const todaysPriorities: PriorityActionItem[] = useMemo(() => {
    const rawItems = AutopilotEngine.computePrioritizedActions(medications || [], sales || []);
    const memory = getWorkflowMemory();

    // Adjust score slightly (+2 per frequent click) to reflect learned user preference
    return rawItems.map(item => {
      const freq = memory[item.actionRoute] || 0;
      const memoryBoost = Math.min(10, freq * 2);
      return {
        ...item,
        priorityScore: Math.min(100, item.priorityScore + memoryBoost),
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [medications, sales, getWorkflowMemory]);

  // 7. Background Automation & Deduplicated Notification Dispatcher
  const runAutopilotBackgroundCheck = useCallback(async () => {
    if (!pharmacy?.id || !medications || medications.length === 0) return;

    const nowMs = Date.now();
    if (nowMs - lastSyncRef.current < 5 * 60 * 1000) return;
    lastSyncRef.current = nowMs;

    try {
      const existingNotificationTitles = new Set(
        (notifications || []).map(n => `${n.title}:${n.message}`)
      );

      const newAlertsToInsert: Array<{
        pharmacy_id: string;
        title: string;
        message: string;
        type: 'warning' | 'info' | 'success' | 'danger';
        priority: 'low' | 'medium' | 'high' | 'critical';
        is_read: boolean;
        entity_type?: string;
        entity_id?: string;
      }> = [];

      if (expiryBuckets.expired.length > 0) {
        const title = '🚨 Expired Stock Alert';
        const message = `${expiryBuckets.expired.length} medicine(s) have expired. ${expiryBuckets.expired[0].name} requires immediate disposal.`;
        const key = `${title}:${message}`;
        if (!existingNotificationTitles.has(key)) {
          newAlertsToInsert.push({
            pharmacy_id: pharmacy.id,
            title,
            message,
            type: 'danger',
            priority: 'critical',
            is_read: false,
            entity_type: 'expiry',
            entity_id: expiryBuckets.expired[0].id,
          });
        }
      }

      if (expiryBuckets.within30Days.length > 0) {
        const title = '⚠️ Medicines Expiring This Month';
        const message = `${expiryBuckets.within30Days.length} medicine(s) expire within 30 days. Consider setting promotional discounts.`;
        const key = `${title}:${message}`;
        if (!existingNotificationTitles.has(key)) {
          newAlertsToInsert.push({
            pharmacy_id: pharmacy.id,
            title,
            message,
            type: 'warning',
            priority: 'high',
            is_read: false,
            entity_type: 'expiry',
          });
        }
      }

      reorderSuggestions.slice(0, 3).forEach(sug => {
        const isOut = sug.currentStock === 0;
        const title = isOut ? `📉 Out of Stock: ${sug.medicationName}` : `📊 Low Stock: ${sug.medicationName}`;
        const message = isOut
          ? `${sug.medicationName} is out of stock. Suggested reorder: ${sug.suggestedQuantity} units.`
          : `${sug.medicationName} has ${sug.currentStock} units left. Runs out in approx ${sug.estimatedEmptyDays} days.`;
        const key = `${title}:${message}`;

        if (!existingNotificationTitles.has(key)) {
          newAlertsToInsert.push({
            pharmacy_id: pharmacy.id,
            title,
            message,
            type: isOut ? 'danger' : 'warning',
            priority: isOut ? 'critical' : 'medium',
            is_read: false,
            entity_type: 'low_stock',
            entity_id: sug.medicationId,
          });
        }
      });

      if (intelligence.salesGrowthPercent !== 0 && Math.abs(intelligence.salesGrowthPercent) >= 15) {
        const isUp = intelligence.salesGrowthPercent > 0;
        const title = isUp ? '📈 Strong Sales Performance' : '📊 Revenue Update';
        const message = isUp
          ? `You sold ${intelligence.salesGrowthPercent}% more today than yesterday!`
          : `Sales are ${Math.abs(intelligence.salesGrowthPercent)}% lower today than yesterday.`;
        const key = `${title}:${message}`;

        if (!existingNotificationTitles.has(key)) {
          newAlertsToInsert.push({
            pharmacy_id: pharmacy.id,
            title,
            message,
            type: isUp ? 'success' : 'info',
            priority: 'low',
            is_read: false,
            entity_type: 'analytics',
          });
        }
      }

      if (newAlertsToInsert.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(newAlertsToInsert);

        if (!error) {
          fetchNotifications();
        }
      }
    } catch (err) {
      console.warn('[AutopilotEngine] Background check warning:', err);
    }
  }, [pharmacy?.id, medications, expiryBuckets, reorderSuggestions, intelligence, notifications, fetchNotifications]);

  useEffect(() => {
    if (!medsLoading && !salesLoading) {
      runAutopilotBackgroundCheck();
      const interval = setInterval(runAutopilotBackgroundCheck, AUTOPILOT_CHECK_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [medsLoading, salesLoading, runAutopilotBackgroundCheck]);

  return {
    reorderSuggestions,
    expiryBuckets,
    intelligence,
    dailyBriefing,
    purchaseDraft,
    clearanceQueue,
    closingReport,
    todaysPriorities,
    recordActionClick,
    isLoading: medsLoading || salesLoading,
    runAutopilotBackgroundCheck,
  };
}
