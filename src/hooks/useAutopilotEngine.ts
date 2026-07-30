import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useMedications } from '@/hooks/useMedications';
import { useSales } from '@/hooks/useSales';
import { usePharmacy } from '@/hooks/usePharmacy';
import { useDbNotifications } from '@/hooks/useDbNotifications';
import { AutopilotEngine, ReorderSuggestion, ExpiryBucket, DashboardIntelligence } from '@/services/autopilotEngine';
import { supabase } from '@/lib/supabase';

const AUTOPILOT_CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes background check

export function useAutopilotEngine() {
  const { medications, isLoading: medsLoading } = useMedications();
  const { sales, isLoading: salesLoading } = useSales();
  const { pharmacy } = usePharmacy();
  const { notifications, fetchNotifications } = useDbNotifications();
  const lastSyncRef = useRef<number>(0);

  // 1. Compute Smart Reorder Suggestions
  const reorderSuggestions: ReorderSuggestion[] = useMemo(() => {
    if (!medications) return [];
    return AutopilotEngine.computeReorderSuggestions(medications, sales || []);
  }, [medications, sales]);

  // 2. Compute Expiry Buckets
  const expiryBuckets: ExpiryBucket = useMemo(() => {
    if (!medications) return { expired: [], within30Days: [], within60Days: [], within90Days: [], totalValueAtRisk: 0 };
    return AutopilotEngine.computeExpiryBuckets(medications);
  }, [medications]);

  // 3. Compute Dashboard Intelligence
  const intelligence: DashboardIntelligence = useMemo(() => {
    return AutopilotEngine.computeDashboardIntelligence(medications || [], sales || []);
  }, [medications, sales]);

  // 4. Background Automation & Deduplicated Notification Dispatcher
  const runAutopilotBackgroundCheck = useCallback(async () => {
    if (!pharmacy?.id || !medications || medications.length === 0) return;

    // Limit execution to once per 5 minutes to prevent spamming DB
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

      // A. Check Expired Items
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

      // B. Check 30-Day Expiring Items
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

      // C. Check Low Stock & Stockouts with Days-to-Empty prediction
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

      // D. Growth Trend Notification
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

      // Bulk insert new alerts into Supabase if any
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

  // Trigger background check on load and periodic interval
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
    isLoading: medsLoading || salesLoading,
    runAutopilotBackgroundCheck,
  };
}
