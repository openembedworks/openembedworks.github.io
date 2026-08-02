/**
 * OpenEmbedWorks – Service Worker
 * File: sw.js
 *
 * Caches the shell (HTML, CSS, JS, JSON) so the site works offline
 * and loads instantly on repeat visits.
 *
 * Cache strategy:
 *   - On install: pre-cache all listed assets.
 *   - On fetch:   serve from cache first, fall back to network.
 *
 * HOW TO BUST THE CACHE after deploying updates:
 *   Increment CACHE_VERSION below (e.g. 'v1' → 'v2').
 *   The old cache is deleted automatically on the next activate event.
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `openembedworks-${CACHE_VERSION}`;

/** Files to pre-cache on installation */
const PRECACHE_URLS = [
  './',
  './index.html',
  './tools.json',
  './assets/css/style.css',
  './assets/js/main.js',
];

/* ---- Install: pre-cache shell assets ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[sw] Pre-caching shell assets');
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ---- Activate: clean up old caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('openembedworks-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[sw] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- Fetch: cache-first with network fallback ---- */
self.addEventListener('fetch', event => {
  // Only handle GET requests to same-origin or the JSON file
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache valid responses for future offline use
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Return cached index for navigation requests when offline
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
