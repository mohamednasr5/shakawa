// Service Worker لنظام الشكاوى الموحد
const CACHE_NAME = 'shakawa-cache-v1';
const urlsToCache = [
  '/shakawa/admin.html',
  '/shakawa/',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] تثبيت');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] تخزين الملفات في الكاش');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] تفعيل');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// معالجة الطلبات
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] إرجاع من الكاش:', event.request.url);
          return response;
        }
        
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // في حالة عدم وجود اتصال بالإنترنت
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

// معالجة إشعارات Push
self.addEventListener('push', event => {
  console.log('[Service Worker] استلام إشعار:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'طلب جديد';
  const options = {
    body: data.body || 'تم استلام طلب جديد في النظام',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-192x192.png',
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

// معالجة النقر على الإشعار
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] نقر على الإشعار:', event.notification.tag);
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
      if (clients.openWindow) {
        return clients.openWindow('/shakawa/admin.html');
      }
    })
  );
});
