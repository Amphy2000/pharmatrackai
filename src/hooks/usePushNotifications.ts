/**
 * usePushNotifications
 *
 * Manages the full Web Push lifecycle on the frontend:
 *  1. Checks browser support and current permission
 *  2. Requests OS-level notification permission from the user
 *  3. Registers the ServiceWorker and subscribes via PushManager using
 *     our server VAPID public key
 *  4. Saves the subscription endpoint + crypto keys to Supabase via the
 *     save-push-subscription Edge Function so the server can send pushes
 *     even when the browser is fully closed
 *  5. Exposes sendTestNotification() which calls the server-side
 *     send-push-notifications function for a real OS background push test
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { usePharmacy } from '@/hooks/usePharmacy';

// ── VAPID public key (must match the private key set in Supabase secrets) ──────
// Generated with: node -e "const c=require('crypto');const e=c.createECDH('prime256v1');e.generateKeys();console.log(e.getPublicKey('base64url'));"
const VAPID_PUBLIC_KEY = 'BGdjD12nIegHfuLwU9JdJbjMd0RGUpOMhxflnNqi3RK_-iPfxB62O0C0u3x47bo178GJTSi5fQTBduzovaCIhJs';

export interface PushNotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const { pharmacy } = usePharmacy();
  const [state, setState] = useState<PushNotificationState>({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    isSupported:
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
    isSubscribed: false,
    subscription: null,
    isLoading: true,
  });

  // Check SW registration + existing PushSubscription on mount
  useEffect(() => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setState((prev) => ({
          ...prev,
          permission: Notification.permission,
          isSubscribed: !!sub,
          subscription: sub,
          isLoading: false,
        }));
      } catch (err) {
        console.error('[usePushNotifications] Error checking subscription:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [state.isSupported]);

  /**
   * Saves the PushSubscription object to the Supabase Edge Function
   * so the server can reach this device even when the app is closed.
   */
  const saveSubscriptionToServer = useCallback(
    async (sub: PushSubscription, pharmacyId: string) => {
      try {
        const subJson = sub.toJSON();
        const { error } = await supabase.functions.invoke('save-push-subscription', {
          body: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh ?? '',
              auth: subJson.keys?.auth ?? '',
            },
            pharmacy_id: pharmacyId,
            user_agent: navigator.userAgent,
          },
        });

        if (error) {
          console.error('[usePushNotifications] Failed to save subscription to server:', error);
        } else {
          console.log('[usePushNotifications] Subscription saved to server — background push active');
        }
      } catch (err) {
        console.error('[usePushNotifications] Error saving subscription:', err);
      }
    },
    []
  );

  /**
   * Request OS notification permission and subscribe to Web Push.
   * Saves the subscription server-side for closed-browser delivery.
   */
  const requestPermissionAndSubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported by this browser.');
      return false;
    }

    if (!pharmacy?.id) {
      toast.error('No pharmacy found. Please ensure you are logged in.');
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Request native OS permission
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied. Enable notifications in your browser settings.');
        setState((prev) => ({ ...prev, permission: permissionResult, isLoading: false }));
        return false;
      }

      // Ensure the ServiceWorker is registered and active
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      // Subscribe to PushManager with our VAPID public key
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Save to Supabase so the server can push to closed browsers
      await saveSubscriptionToServer(sub, pharmacy.id);

      localStorage.setItem('push_notification_enabled', 'true');
      setState({
        permission: 'granted',
        isSupported: true,
        isSubscribed: true,
        subscription: sub,
        isLoading: false,
      });

      // Fire an immediate local confirmation notification
      await registration.showNotification('PharmaTrack Push Alerts Enabled 🔔', {
        body: 'You will receive expiry, low-stock & AI briefing alerts on this device — even when the app is closed!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pharmatrack-push-enabled',
        vibrate: [100, 50, 100],
      });

      toast.success('Push notifications enabled! Alerts will reach you even with the app closed.');
      return true;
    } catch (error) {
      console.error('[usePushNotifications] Failed to enable push:', error);
      toast.error('Failed to enable push notifications. Please try again.');
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, pharmacy?.id, saveSubscriptionToServer]);

  /**
   * Triggers a real server-side Web Push test.
   * The Edge Function will look up this user's subscription and send a
   * genuine OS notification via the push protocol — this proves the
   * closed-browser delivery path is working.
   */
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== 'granted') {
      const granted = await requestPermissionAndSubscribe();
      if (!granted) return;
    }

    try {
      // Get current Supabase user for the test
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to test push notifications.');
        return;
      }

      toast.info('Sending a real server-side push notification to your device…');

      const { error } = await supabase.functions.invoke('send-push-notifications', {
        body: {
          user_id: user.id,
          test_payload: JSON.stringify({
            title: '🚨 Test: PharmaTrack Push Working!',
            body: 'This is a real server-sent push — it works even when the browser is closed!',
            url: '/notifications',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
          }),
        },
      });

      if (error) {
        console.error('[usePushNotifications] Test push error:', error);
        toast.error('Test push failed. Check the Supabase function logs.');
      } else {
        toast.success('Test push sent from server! Check your device notifications.');
      }
    } catch (err) {
      console.error('[usePushNotifications] sendTestNotification error:', err);
      toast.error('Test push failed.');
    }
  }, [requestPermissionAndSubscribe]);

  return {
    ...state,
    requestPermissionAndSubscribe,
    sendTestNotification,
  };
};

// Converts a base64url VAPID public key string to a Uint8Array for PushManager.subscribe()
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
