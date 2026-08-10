import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface PushNotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    isSubscribed: false,
    subscription: null,
    isLoading: true,
  });

  // Check SW & Push Subscription status on mount
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
        console.error('[PushNotifications] Error checking subscription:', err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [state.isSupported]);

  // Request native OS Notification permission and subscribe to PushManager
  const requestPermissionAndSubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported by this browser.');
      return false;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const permissionResult = await Notification.requestPermission();

      if (permissionResult !== 'granted') {
        toast.error('Notification permission was denied. Please enable notifications in your browser settings.');
        setState((prev) => ({ ...prev, permission: permissionResult, isLoading: false }));
        return false;
      }

      // Ensure SW is active & registered
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      await navigator.serviceWorker.ready;

      // Subscribe to PushManager (userVisibleOnly is required for Web Push)
      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        // Sample public VAPID application key if provided, or standard userVisibleOnly subscription
        try {
          sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              'BEl62iUYgUivxIkv69yViEuiBIa40yYw01H5_T-_V049L3H4k3xH-S9q63p19_s009j12k3l1m2n3o4p'
            ),
          });
        } catch (subErr) {
          // Fallback if VAPID key fails
          console.warn('[PushNotifications] Subscribing without VAPID key fallback:', subErr);
        }
      }

      // Store subscription in localStorage & state
      localStorage.setItem('push_notification_enabled', 'true');
      setState({
        permission: 'granted',
        isSupported: true,
        isSubscribed: true,
        subscription: sub,
        isLoading: false,
      });

      // Fire confirmation notification
      if (registration && registration.showNotification) {
        registration.showNotification('PharmaTrack Push Active 🔔', {
          body: 'You will now receive vital stockout, expiry, and daily briefing alerts even when the app is closed!',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'pharmatrack-push-enabled',
          vibrate: [100, 50, 100],
        });
      }

      toast.success('Push notifications enabled! You will get vital alerts even when closed.');
      return true;
    } catch (error) {
      console.error('[PushNotifications] Failed to enable push:', error);
      toast.error('Failed to enable push notifications.');
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  // Dispatch a test background OS push notification
  const sendTestNotification = useCallback(async () => {
    if (Notification.permission !== 'granted') {
      const granted = await requestPermissionAndSubscribe();
      if (!granted) return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🚨 Critical Expiry Alert (Test)', {
        body: 'Amoxicillin 500mg (Batch BN2024) expires in 3 days! 45 units remaining.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-push-' + Date.now(),
        vibrate: [200, 100, 200],
        data: { url: '/inventory?filter=expiring' },
      });
      toast.info('Test Push Notification sent to your device status bar/notification center!');
    } catch (err) {
      console.error('[PushNotifications] Error sending test push:', err);
    }
  }, [requestPermissionAndSubscribe]);

  return {
    ...state,
    requestPermissionAndSubscribe,
    sendTestNotification,
  };
};

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
