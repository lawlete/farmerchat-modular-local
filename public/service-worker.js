const CACHE_NAME = 'farmerchat-ia-cache-v1.3'; // Incremented version
const URLS_TO_CACHE = [
  '/', // Serves index.html
  '/index.html',
  '/manifest.json',
  '/service-worker.js', // Cache the service worker itself
  // PWA icons (ensure these paths match your public/icons directory)
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // Vite's main CSS/JS bundles will have hashes and be cached dynamically.
  // Tailwind is loaded from CDN, so it's subject to its own caching.
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell and essential assets');
        return cache.addAll(URLS_TO_CACHE).catch(error => {
          console.error('[ServiceWorker] Failed to cache all initial resources:', error);
          // Attempt to cache a minimal set if addAll fails for robustness
          return cache.addAll(['/', '/index.html', '/manifest.json', '/service-worker.js']);
        });
      })
      .then(() => {
        return self.skipWaiting(); // Activate worker immediately
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
        return self.clients.claim(); // Take control of all open clients
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // For navigation requests (HTML pages), try network first, then cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If successful and it's for our origin, cache it.
          if (response && response.status === 200 && request.url.startsWith(self.location.origin)) {
             const responseToCache = response.clone();
             caches.open(CACHE_NAME).then(cache => {
               cache.put(request, responseToCache);
             });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html'); // Fallback to main shell
            });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images, fonts, etc.), use cache-first strategy.
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[ServiceWorker] Found in cache:', request.url);
          return cachedResponse;
        }

        // console.log('[ServiceWorker] Not in cache, fetching:', request.url);
        return fetch(request).then(
          networkResponse => {
            // Cache the new resource if it's a successful GET request from our origin or known CDNs
            // This will catch Vite's hashed assets, Google Fonts, etc.
            if (networkResponse && networkResponse.status === 200 && request.method === 'GET' &&
               (request.url.startsWith(self.location.origin) || 
                request.url.includes('fonts.googleapis.com') || 
                request.url.includes('fonts.gstatic.com') ||
                request.url.includes('cdn.tailwindcss.com') // Cache Tailwind if needed
               )) {
              // console.log('[ServiceWorker] Caching new resource:', request.url);
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
          console.error('[ServiceWorker] Fetch failed for:', request.url, error);
          // Optionally, return a generic offline fallback for specific asset types (e.g., images)
          // For now, just let the browser handle the error if cache fails and network fails.
          // Consider returning a placeholder for images or a specific offline response for API calls if applicable.
        });
      })
  );
});
