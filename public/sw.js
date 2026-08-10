/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// IMPORTANT: Update this version number when deploying changes to force cache refresh
const SW_VERSION = 'v6-2026.08.10';
const CACHE_NAME = `pharmatrack-pos-${SW_VERSION}`;
const STATIC_CACHE = `pharmatrack-static-${SW_VERSION}`;
const DATA_CACHE = `pharmatrack-data-${SW_VERSION}`;
const PENDING_SYNC = 'pharmatrack-pending-sync';

// Static assets to cache - minimal for development
const STATIC_ASSETS = [
  '/manifest.json',
];

// Install event - cache static assets and immediately take over
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log(`[ServiceWorker] Installing ${SW_VERSION}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force new service worker to activate immediately - skip waiting phase
  self.skipWaiting();
});

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log(`[ServiceWorker] Activating ${SW_VERSION}...`);
  event.waitUntil(
    (async () => {
      // Delete ALL old caches that don't match current version
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => 
            !name.includes(SW_VERSION) && name !== PENDING_SYNC
          )
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      // Take control of all clients immediately
      await self.clients.claim();
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: SW_VERSION,
          message: 'New version available',
        });
      });
    })()
  );
});

// Fetch event - ALWAYS NETWORK FIRST, cache only as fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests entirely
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // For API requests - network only with data cache fallback for offline
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful GET responses for offline fallback
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed, try cache for offline support
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline error response
          return new Response(
            JSON.stringify({ error: 'offline', message: 'You are offline. Data will sync when connection is restored.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // For navigation and all other requests - NETWORK FIRST, no caching navigation
  event.respondWith(
    fetch(request)
      .then((response) => {
        // NEVER cache navigation/HTML requests - always serve fresh
        if (request.mode === 'navigate' || request.destination === 'document') {
          return response;
        }
        
        // Only cache static assets (JS, CSS, images) for offline fallback
        if (response.ok && (
          request.destination === 'script' ||
          request.destination === 'style' ||
          request.destination === 'image' ||
          request.destination === 'font'
        )) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed, try cache only as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // For navigation, try to return cached index for offline app shell
        if (request.mode === 'navigate') {
          const indexResponse = await caches.match('/');
          if (indexResponse) return indexResponse;
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Background sync for offline sales
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncPendingSales());
  }
});

async function syncPendingSales() {
  try {
    const pendingData = await getPendingData();
    
    for (const sale of pendingData.sales || []) {
      try {
        const response = await fetch('/rest/v1/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sale),
        });

        if (response.ok) {
          await removePendingSale(sale.id);
          console.log('[ServiceWorker] Synced sale:', sale.id);
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync sale:', error);
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        message: 'Offline sales have been synced',
      });
    });
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

async function getPendingData(): Promise<{ sales: any[] }> {
  const cache = await caches.open(PENDING_SYNC);
  const response = await cache.match('/pending-data');
  if (response) {
    return response.json();
  }
  return { sales: [] };
}

async function removePendingSale(saleId: string) {
  const pendingData = await getPendingData();
  pendingData.sales = pendingData.sales.filter((s: any) => s.id !== saleId);
  const cache = await caches.open(PENDING_SYNC);
  await cache.put('/pending-data', new Response(JSON.stringify(pendingData)));
}

// Listen for messages from the main app
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'QUEUE_SALE') {
    event.waitUntil(queueSaleForSync(event.data.sale));
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Force refresh all caches
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name !== PENDING_SYNC)
            .map((name) => caches.delete(name))
        );
        // Notify the client
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHES_CLEARED' });
        });
      })()
    );
  }
});

async function queueSaleForSync(sale: any) {
  const pendingData = await getPendingData();
  pendingData.sales.push(sale);
  const cache = await caches.open(PENDING_SYNC);
  await cache.put('/pending-data', new Response(JSON.stringify(pendingData)));
  
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-sales');
  }
// ----------------------------------------------------
// WEB PUSH & BACKGROUND NOTIFICATION EVENT HANDLERS
// ----------------------------------------------------

// Handle Web Push Event from OS/Server even when app is closed
self.addEventListener('push', (event: PushEvent) => {
  console.log('[ServiceWorker] Push event received:', event);

  let data = {
    title: 'PharmaTrack AI Alert 🔔',
    body: 'You have a vital pharmacy notification.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/dashboard',
    urgency: 'high',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: 'pharmatrack-push-alert',
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle OS Notification banner click event
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus open client window if available
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if app was closed
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

export {};
