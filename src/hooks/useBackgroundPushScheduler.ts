/**
 * useBackgroundPushScheduler
 *
 * Monitors medication inventory in the foreground and dispatches
 * OS-level push notifications via the Service Worker so the user
 * sees them even when the browser tab is backgrounded or the
 * device screen is off.
 *
 * Trigger schedule (while the PWA is open):
 *  - On first mount (initial inventory snapshot check)
 *  - Every 30 minutes thereafter
 *  - Once a day at 08:00 for the "Opening Briefing" summary
 *
 * When the app is CLOSED the browser itself cannot run this hook;
 * that requires a server-sent Web Push (future server-side work).
 * This hook covers the "tab open but minimised / other tab" case.
 */
import { useEffect, useRef, useCallback } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { useMedications } from '@/hooks/useMedications';

const SCHEDULER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const THROTTLE_KEY_PREFIX = 'push_sent_'; // localStorage key to throttle per-alert-type

// Minimum gap between same-type push notifications (ms)
const THROTTLE_GAPS: Record<string, number> = {
  expired: 4 * 60 * 60 * 1000,       // 4 hours
  expiring_soon: 8 * 60 * 60 * 1000,  // 8 hours
  low_stock: 4 * 60 * 60 * 1000,      // 4 hours
  out_of_stock: 2 * 60 * 60 * 1000,   // 2 hours
  daily_briefing: 22 * 60 * 60 * 1000, // 22 hours (≈ once/day)
};

function shouldSendAlert(key: string): boolean {
  const gapMs = THROTTLE_GAPS[key] ?? 60 * 60 * 1000;
  const stored = localStorage.getItem(`${THROTTLE_KEY_PREFIX}${key}`);
  if (!stored) return true;
  return Date.now() - Number(stored) > gapMs;
}

function markAlertSent(key: string) {
  localStorage.setItem(`${THROTTLE_KEY_PREFIX}${key}`, String(Date.now()));
}

async function showOSPush(
  title: string,
  body: string,
  opts: {
    tag?: string;
    url?: string;
    urgency?: 'normal' | 'high';
    vibrate?: number[];
  } = {}
) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: opts.tag ?? 'pharmatrack-bg',
      vibrate: opts.vibrate ?? [150, 75, 150],
      requireInteraction: opts.urgency === 'high',
      renotify: true,
      data: { url: opts.url ?? '/notifications' },
      actions: [
        { action: 'open', title: 'View Now' },
        { action: 'dismiss', title: 'Later' },
      ],
    });
  } catch (err) {
    console.warn('[BackgroundPushScheduler] showNotification failed:', err);
  }
}

export const useBackgroundPushScheduler = () => {
  const { medications } = useMedications();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runChecks = useCallback(async () => {
    if (
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted' ||
      !medications ||
      medications.length === 0
    ) {
      return;
    }

    const now = new Date();

    // ── 1. EXPIRED MEDICATIONS ──────────────────────────────────────────
    const expired = medications.filter((m) => {
      try { return parseISO(m.expiry_date) < now; } catch { return false; }
    });
    if (expired.length > 0 && shouldSendAlert('expired')) {
      const names = expired.slice(0, 3).map((m) => m.name).join(', ');
      await showOSPush(
        `🚨 ${expired.length} Medication${expired.length > 1 ? 's' : ''} EXPIRED`,
        `${names}${expired.length > 3 ? ` +${expired.length - 3} more` : ''} — Remove from shelf immediately.`,
        { tag: 'expired', url: '/inventory?filter=expired', urgency: 'high', vibrate: [300, 100, 300] }
      );
      markAlertSent('expired');
    }

    // ── 2. EXPIRING SOON (≤30 days) ──────────────────────────────────────
    const expiringSoon = medications.filter((m) => {
      try {
        const d = differenceInDays(parseISO(m.expiry_date), now);
        return d > 0 && d <= 30;
      } catch { return false; }
    });
    if (expiringSoon.length > 0 && shouldSendAlert('expiring_soon')) {
      const soonest = expiringSoon.sort((a, b) =>
        parseISO(a.expiry_date).getTime() - parseISO(b.expiry_date).getTime()
      );
      const daysLeft = differenceInDays(parseISO(soonest[0].expiry_date), now);
      await showOSPush(
        `⚠️ ${expiringSoon.length} Item${expiringSoon.length > 1 ? 's' : ''} Expiring Soon`,
        `"${soonest[0].name}" expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Consider promotions or return to supplier.`,
        { tag: 'expiring_soon', url: '/notifications?filter=expiring' }
      );
      markAlertSent('expiring_soon');
    }

    // ── 3. OUT OF STOCK ───────────────────────────────────────────────────
    const outOfStock = medications.filter((m) => m.current_stock === 0);
    if (outOfStock.length > 0 && shouldSendAlert('out_of_stock')) {
      const names = outOfStock.slice(0, 3).map((m) => m.name).join(', ');
      await showOSPush(
        `📦 ${outOfStock.length} Item${outOfStock.length > 1 ? 's' : ''} OUT of Stock`,
        `${names}${outOfStock.length > 3 ? ` +${outOfStock.length - 3} more` : ''} — Reorder urgently.`,
        { tag: 'out_of_stock', url: '/suppliers', urgency: 'high', vibrate: [200, 100, 200] }
      );
      markAlertSent('out_of_stock');
    }

    // ── 4. LOW STOCK ──────────────────────────────────────────────────────
    const lowStock = medications.filter(
      (m) => m.current_stock > 0 && m.current_stock <= m.reorder_level
    );
    if (lowStock.length > 0 && shouldSendAlert('low_stock')) {
      const names = lowStock.slice(0, 3).map((m) => m.name).join(', ');
      await showOSPush(
        `📉 ${lowStock.length} Item${lowStock.length > 1 ? 's' : ''} Low on Stock`,
        `${names}${lowStock.length > 3 ? ` +${lowStock.length - 3} more` : ''} — Time to reorder.`,
        { tag: 'low_stock', url: '/suppliers' }
      );
      markAlertSent('low_stock');
    }

    // ── 5. MORNING DAILY BRIEFING (08:00–09:30 window) ───────────────────
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isBriefingWindow = hour === 8 || (hour === 9 && minute <= 30);
    if (isBriefingWindow && shouldSendAlert('daily_briefing')) {
      const criticalCount = expired.length + outOfStock.length;
      const warningCount = expiringSoon.length + lowStock.length;
      await showOSPush(
        '⚡ PharmaTrack Morning Briefing',
        criticalCount > 0
          ? `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} need attention. ${warningCount} items need monitoring today.`
          : warningCount > 0
          ? `All clear! ${warningCount} item${warningCount > 1 ? 's' : ''} to monitor today.`
          : '✅ All clear! Inventory looks healthy today.',
        { tag: 'daily_briefing', url: '/dashboard', urgency: 'high' }
      );
      markAlertSent('daily_briefing');
    }
  }, [medications]);

  // Run on mount and every 30 minutes
  useEffect(() => {
    // Small delay so medications state is populated first
    const initTimer = setTimeout(() => {
      runChecks();
    }, 3000);

    timerRef.current = setInterval(() => {
      runChecks();
    }, SCHEDULER_INTERVAL_MS);

    return () => {
      clearTimeout(initTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runChecks]);
};
