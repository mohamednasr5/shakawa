// Service Worker لنظام الشكاوى الموحد
const CACHE_NAME = 'shakawa-cache-v1';

const urlsToCache = [
  '/shakawa/',
  '/shakawa/admin.html',
  '/shakawa/index.html',

  // أيقونات PWA
  '/shakawa/icon-192x192.png',
  '/shakawa/icon-512x512.png',

  // خطوط ومكتبات خارجية
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting())
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// جلب الطلبات (Cache First)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // في حالة عدم الاتصال
        if (event.request.mode === 'navigate') {
          return caches.match('/shakawa/admin.html');
        }
        return new Response('لا يوجد اتصال بالإنترنت', {
          status: 408,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});

// إشعارات Push
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'طلب جديد';
  const options = {
    body: data.body || 'تم استلام طلب جديد في النظام',
    icon: '/shakawa/icon-192x192.png',
    badge: '/shakawa/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'new-complaint',
    data: {
      url: data.url || '/shakawa/admin.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// عند الضغط على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('/shakawa/') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/shakawa/admin.html');
    })
  );
});
