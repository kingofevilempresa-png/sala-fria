const CACHE_NAME = 'sala-fria-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192.png',
    '/pwa-512.png'
];

// Install: pre-cache critical static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Network First for API, Stale-While-Revalidate for Assets
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Ignore non-GET and Supabase/external requests
    if (request.method !== 'GET') return;
    if (request.url.includes('supabase.co')) return;
    if (request.url.startsWith('chrome-extension://')) return;
    if (!request.url.startsWith('http')) return;

    // For assets (JS, CSS, images), use Cache First with Network Update (Stale-While-Revalidate)
    if (request.url.includes('/assets/') || STATIC_ASSETS.includes(new URL(request.url).pathname)) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(request).then((cachedResponse) => {
                    const fetchedResponse = fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                    return cachedResponse || fetchedResponse;
                });
            })
        );
        return;
    }

    // Default: Network First, falling back to cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, clone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
