// A robust service worker for caching and background updates.
const CACHE_NAME = 'restudy-cache-v4'; // Incremented version to trigger update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install: Pre-cache the app shell and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active one.
  );
});

// Activate: Clean up old caches and take control of clients
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages.
  );
});

// Fetch: Apply caching strategies
self.addEventListener('fetch', event => {
  // Use Network-First for navigation requests (the HTML page)
  // This ensures users always get the latest app shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If fetch succeeds, cache the new response and return it
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If fetch fails (offline), serve the cached index.html as a fallback
          return caches.match('/');
        })
    );
    return;
  }

  // Use Cache-First for all other requests (JS, CSS, images, etc.)
  // These assets are typically versioned, so if they are in the cache, they are good to use.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Otherwise, fetch from the network
        return fetch(event.request).then(response => {
          // Check for a valid response to cache
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response and cache it for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
  );
});
