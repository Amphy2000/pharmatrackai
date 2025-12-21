/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'pharmatrack-pos-v1';
const STATIC_CACHE = 'pharmatrack-static-v1';
const DATA_CACHE = 'pharmatrack-data-v1';
const PENDING_SYNC = 'pharmatrack-pending-sync';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/checkout',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DATA_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // For API requests, try network first
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response to cache it
          const responseClone = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback for API requests
          return new Response(
            JSON.stringify({ error: 'offline', message: 'You are offline. Data will sync when connection is restored.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // For static assets, cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response but also fetch in background
        fetch(request).then((response) => {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/') || new Response('Offline', { status: 503 });
        }
        return new Response('Offline', { status: 503 });
      });
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
        // Attempt to sync the sale
        const response = await fetch('/rest/v1/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sale),
        });

        if (response.ok) {
          // Remove from pending
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
});

async function queueSaleForSync(sale: any) {
  const pendingData = await getPendingData();
  pendingData.sales.push(sale);
  const cache = await caches.open(PENDING_SYNC);
  await cache.put('/pending-data', new Response(JSON.stringify(pendingData)));
  
  // Request background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-sales');
  }
}

export {};