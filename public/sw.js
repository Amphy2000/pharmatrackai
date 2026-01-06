/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'pharmatrack-pos-v2';
const STATIC_CACHE = 'pharmatrack-static-v2';
const DATA_CACHE = 'pharmatrack-data-v2';
const PENDING_SYNC = 'pharmatrack-pending-sync';

// Static assets to cache - minimal for development
const STATIC_ASSETS = [
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force new service worker to activate immediately
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name !== STATIC_CACHE && 
            name !== DATA_CACHE && 
            name !== CACHE_NAME &&
            name !== PENDING_SYNC
          )
          .map((name) => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - NETWORK FIRST for everything (fixes refresh issues)
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API requests, always network first with cache fallback
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
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

  // For all other requests (HTML, JS, CSS) - NETWORK FIRST to ensure fresh content
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Don't cache navigation requests to ensure fresh content
        if (request.mode === 'navigate') {
          return response;
        }
        // Cache other assets for offline fallback
        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
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
        // For navigation requests, return cached index
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