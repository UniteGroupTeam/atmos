const CACHE_NAME = 'atmos-v2.1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        var fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(
          function(response) {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
                // Ignore caching API and Google Apps Script requests
                if(!event.request.url.includes('api.open-meteo.com') && !event.request.url.includes('script.google.com')) {
                    cache.put(event.request, responseToCache);
                }
            });
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Self-Push Simulation
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE_PUSH') {
        const delay = event.data.delay || 172800000; // 48 hrs
        
        console.log(`SW: Notification scheduled in ${delay/1000}s`);

        // Since a true web push needs a backend, we simulate it here with setTimeout
        // In a real PWA context, if the browser kills the SW, this timeout is lost.
        // For production without a backend Server, you rely on Periodic Sync API if available.
        // For the sake of the UX, we deploy this local trigger:
        setTimeout(() => {
            self.registration.showNotification("¿Sigue el desperdicio?", {
                body: "Atmos detectó que tu reporte de fuga lleva 2 días activo. Confirma si ya fue resuelta.",
                icon: "icon.svg",
                badge: "icon.svg",
                vibrate: [200, 100, 200, 100, 200],
                data: {
                    url: "/"
                }
            });
        }, delay);
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            if (windowClients.length > 0) {
                windowClients[0].focus();
            } else {
                clients.openWindow(event.notification.data.url);
            }
        })
    );
});
