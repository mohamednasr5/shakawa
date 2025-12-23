// Service Worker لنظام الشكاوى الموحد
const CACHE_NAME = 'shakawa-cache-v2';
const urlsToCache = [
  // الصفحات الرئيسية
  '/shakawa/',
  '/shakawa/index.html',
  '/shakawa/admin.html',
  
  // الأيقونات
  '/shakawa/icon-192x192.png',
  '/shakawa/icon-512x512.png',
  
  // ملفات الـ manifest
  '/shakawa/manifest-index.json',
  '/shakawa/manifest-admin.json',
  
  // مكتبات خارجية
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
        if (!networkResponse || networkResponse.status !== 200) {
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
          // التحقق من الصفحة المطلوبة
          const url = new URL(event.request.url);
          if (url.pathname.includes('admin')) {
            return caches.match('/shakawa/admin.html');
          } else {
            return caches.match('/shakawa/index.html');
          }
        }
        return new Response('لا يوجد اتصال بالإنترنت', {
          status: 408,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});

// إشعارات Push - إصدار محسن
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  // تحديد نوع الإشعار
  const notificationType = data.type || 'general';
  let title, body, icon, url;
  
  switch(notificationType) {
    case 'new-complaint':
      title = 'شكوى جديدة 📝';
      body = `تم استلام شكوى جديدة من ${data.clientName || 'عميل'}`;
      icon = '/shakawa/icon-192x192.png';
      url = '/shakawa/admin.html';
      break;
    case 'status-update':
      title = 'تحديث حالة الشكوى 🔄';
      body = `تم تحديث حالة الشكوى ${data.complaintNumber || ''}`;
      icon = '/shakawa/icon-192x192.png';
      url = '/shakawa/index.html';
      break;
    default:
      title = data.title || 'إشعار جديد';
      body = data.body || 'لديك إشعار جديد من النظام';
      icon = '/shakawa/icon-192x192.png';
      url = data.url || '/shakawa/';
  }

  const options = {
    body: body,
    icon: icon,
    badge: '/shakawa/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: notificationType,
    data: {
      url: url,
      type: notificationType,
      timestamp: new Date().toISOString()
    },
    actions: [
      {
        action: 'open',
        title: 'فتح'
      },
      {
        action: 'close',
        title: 'إغلاق'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// عند الضغط على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/shakawa/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // البحث عن نافذة مفتوحة بالفعل
      for (const client of windowClients) {
        if (client.url.includes('/shakawa/') && 'focus' in client) {
          return client.focus().then(() => {
            // إرسال رسالة إلى الصفحة إذا لزم الأمر
            if (notificationData.type) {
              client.postMessage({
                type: 'notificationClick',
                data: notificationData
              });
            }
          });
        }
      }
      // فتح نافذة جديدة إذا لم تكن هناك نافذة مفتوحة
      return clients.openWindow(urlToOpen);
    })
  );
});

// استقبال الرسائل من الصفحة
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
