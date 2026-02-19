const CACHE_NAME = 'sala-fria-v3';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
    console.log('SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Usamos map para tentar adicionar individualmente e não quebrar tudo se um falhar
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Erro ao cachear:', url, err)))
            );
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    console.log('SW: Ativado!');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    // Ignorar requisições para o Supabase ou extensões do Chrome
    if (event.request.url.includes('supabase.co') || event.request.url.startsWith('chrome-extension')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Cachear apenas arquivos do próprio servidor (mesma origem)
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // Se falhar e for navegação, pode retornar o index.html (fallback offline)
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});
