const CACHE_NAME = 'wb-reader-v25'; // Improved Synced Button Design
const ASSETS = [
    './',
    './index.html',
    './app.css?v=16',
    './app.js',
    './manifest.json',
    './supabase-config.js',
    './assets/logo.png',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If we got a valid response, maybe cache it if it's an internal asset
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        // Only cache internal assets or fonts we care about
                        if (event.request.url.startsWith(self.location.origin) || 
                            event.request.url.includes('fonts.googleapis.com')) {
                            cache.put(event.request, responseClone);
                        }
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    
                    // If neither network nor cache works, return a custom offline response for navigation
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    
                    // Fallback for everything else (avoids TypeError: Failed to convert value to 'Response')
                    return new Response('Network error occurred', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' }
                    });
                });
            })
    );
});