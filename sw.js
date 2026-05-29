const CACHE_NAME = 'yusr-cache-v1';
const ASSETS_TO_CACHE = [
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/tasks.js',
  './js/finance.js',
  './js/health.js',
  './js/notifications.js',
  './js/ai.js',
  './js/charts.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching app assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached asset, or fetch from network and cache
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Cache the newly fetched asset (only for GET requests and valid schemes)
        if (event.request.method === 'GET' && (event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return networkResponse;
      }).catch(() => {
        // Offline fallback for HTML if fetch fails
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
