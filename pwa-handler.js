// =============== PWA Handler for both apps ===============
class PWAHandler {
  constructor(appType = 'client') {
    this.appType = appType; // 'client' or 'admin'
    this.deferredPrompt = null;
    this.isAppInstalled = false;
    this.init();
  }

  init() {
    this.checkIfAppInstalled();
    this.registerServiceWorker();
    this.setupEventListeners();
    this.showWelcomeMessage();
  }

  // تسجيل Service Worker
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(registration => {
          console.log('Service Worker registered successfully:', registration);
          
          // تفعيل الإشعارات
          this.requestNotificationPermission();
          
          // التحقق من التحديثات
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateMessage();
              }
            });
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }

  // التحقق من تثبيت التطبيق
  checkIfAppInstalled() {
    // طرق الكشف عن التطبيقات المثبتة
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isIOS = window.navigator.standalone === true;
    const localStorageInstalled = localStorage.getItem(`appInstalled_${this.appType}`) === 'true';

    this.isAppInstalled = isStandalone || isFullscreen || isIOS || localStorageInstalled;
    
    if (this.isAppInstalled) {
      this.hideInstallButton();
    }
  }

  // إعداد مستمعي الأحداث
  setupEventListeners() {
    // حدث قبل التثبيت (Android)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // حدث بعد التثبيت
    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully');
      this.isAppInstalled = true;
      localStorage.setItem(`appInstalled_${this.appType}`, 'true');
      this.hideInstallPrompt();
      this.showSuccessMessage();
    });

    // حدث تغيير وضع العرض
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isAppInstalled = e.matches;
      if (this.isAppInstalled) {
        this.hideInstallButton();
      }
    });
  }

  // عرض رسالة الترحيب
  showWelcomeMessage() {
    if (!this.isAppInstalled && !localStorage.getItem(`welcomeShown_${this.appType}`)) {
      setTimeout(() => {
        const message = this.appType === 'client' 
          ? '📱 يمكنك تثبيت تطبيق الشكاوى على شاشتك الرئيسية للوصول السريع!'
          : '📱 يمكنك تثبيت لوحة التحكم على شاشتك الرئيسية لإدارة الشكاوى بسهولة!';
        
        this.showToast(message, 'info', 5000);
        localStorage.setItem(`welcomeShown_${this.appType}`, 'true');
      }, 3000);
    }
  }

  // عرض نافذة التثبيت
  showInstallPrompt() {
    if (this.isAppInstalled || !this.deferredPrompt) return;

    const installContainer = document.getElementById('installContainer');
    const installDescription = document.getElementById('installDescription');
    
    if (!installContainer) return;

    let instructions = '';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      instructions = `
        <p><strong>لتثبيت التطبيق على iOS:</strong></p>
        <ol style="text-align: right; margin-right: 15px;">
          <li>اضغط على زر "مشاركة" في أسفل المتصفح</li>
          <li>اختر "أضف إلى الشاشة الرئيسية"</li>
          <li>اضغط على "إضافة" في الزاوية العليا اليمنى</li>
        </ol>
      `;
    } else {
      instructions = `
        <p><strong>لتثبيت التطبيق على Android:</strong></p>
        <ol style="text-align: right; margin-right: 15px;">
          <li>اضغط على زر "تثبيت" أدناه</li>
          <li>في النافذة المنبثقة، اضغط على "تثبيت"</li>
          <li>سيظهر التطبيق على شاشتك الرئيسية</li>
        </ol>
      `;
    }

    const appName = this.appType === 'client' ? 'تطبيق الشكاوى' : 'لوحة التحكم';
    installDescription.innerHTML = `
      <p>${this.appType === 'client' 
        ? 'ثبت تطبيق الشكاوى على شاشتك الرئيسية لتقديم ومتابعة الشكاوى بسهولة' 
        : 'ثبت لوحة التحكم على شاشتك الرئيسية لإدارة الشكاوى بسهولة'}</p>
      ${instructions}
    `;

    installContainer.style.display = 'flex';
  }

  // إخفاء نافذة التثبيت
  hideInstallPrompt() {
    const installContainer = document.getElementById('installContainer');
    if (installContainer) {
      installContainer.style.display = 'none';
    }
  }

  // إخفاء زر التثبيت
  hideInstallButton() {
    const floatingBtn = document.getElementById('floatingInstallBtn');
    if (floatingBtn) {
      floatingBtn.style.display = 'none';
    }
  }

  // طلب إذن الإشعارات
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notification permission granted');
            if (this.appType === 'admin') {
              this.sendWelcomeNotification();
            }
          }
        });
      }, 2000);
    }
  }

  // إرسال إشعار ترحيبي
  sendWelcomeNotification() {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        const title = this.appType === 'client' 
          ? 'مرحباً بكم في تطبيق الشكاوى' 
          : 'مرحباً بك في لوحة التحكم';
        
        const body = this.appType === 'client'
          ? 'يمكنك الآن تقديم ومتابعة شكواك بسهولة'
          : 'يمكنك الآن إدارة الشكاوى والطلبات بكل سهولة';

        registration.showNotification(title, {
          body: body,
          icon: 'icon-192x192.png',
          badge: 'icon-192x192.png',
          vibrate: [200, 100, 200]
        });
      });
    }
  }

  // عرض رسالة التحديث
  showUpdateMessage() {
    const message = '🔄 تم تحديث التطبيق! يرجى إعادة تحميل الصفحة للحصول على أحدث الميزات.';
    this.showToast(message, 'info', 10000);
  }

  // عرض رسالة النجاح
  showSuccessMessage() {
    const message = this.appType === 'client'
      ? '✅ تم تثبيت تطبيق الشكاوى بنجاح على شاشتك الرئيسية!'
      : '✅ تم تثبيت لوحة التحكم بنجاح على شاشتك الرئيسية!';
    
    this.showToast(message, 'success', 5000);
  }

  // دالة مساعدة لعرض Toast
  showToast(message, type = 'info', duration = 3000) {
    // إنشاء عنصر Toast إذا لم يكن موجوداً
    let toast = document.getElementById('pwa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwa-toast';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 12px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        max-width: 400px;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    // تعيين الأنماط حسب النوع
    const colors = {
      success: 'linear-gradient(135deg, #1a5fb4, #2d8fd5)',
      error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
      info: 'linear-gradient(135deg, #3498db, #2980b9)',
      warning: 'linear-gradient(135deg, #f39c12, #e67e22)'
    };

    toast.style.background = colors[type] || colors.info;
    toast.innerHTML = message;
    toast.style.display = 'block';

    // إخفاء بعد المدة المحددة
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.style.display = 'none';
        toast.style.animation = '';
      }, 300);
    }, duration);
  }

  // دالة التثبيت
  async install() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    }
  }

  // التحقق من اتصال الإنترنت
  checkOnlineStatus() {
    if (!navigator.onLine) {
      this.showToast('⚠️ أنت غير متصل بالإنترنت', 'warning', 5000);
    }
    
    window.addEventListener('online', () => {
      this.showToast('✅ تم استعادة الاتصال بالإنترنت', 'success', 3000);
    });
    
    window.addEventListener('offline', () => {
      this.showToast('⚠️ فقدت الاتصال بالإنترنت', 'warning', 5000);
    });
  }

  // تحديث التطبيق
  updateApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update();
      });
    }
  }
}

// =============== تهيئة PWA حسب الصفحة ===============
document.addEventListener('DOMContentLoaded', function() {
  // تحديد نوع التطبيق بناءً على الصفحة
  const isAdminPage = window.location.pathname.includes('admin.html');
  const appType = isAdminPage ? 'admin' : 'client';
  
  // إنشاء مثيل PWAHandler
  window.pwaHandler = new PWAHandler(appType);
  
  // التحقق من اتصال الإنترنت
  window.pwaHandler.checkOnlineStatus();
  
  // ربط أزرار التثبيت
  document.addEventListener('click', function(e) {
    if (e.target.id === 'installButton' || e.target.closest('#installButton')) {
      window.pwaHandler.install();
    }
    
    if (e.target.id === 'cancelInstall' || e.target.closest('#cancelInstall')) {
      window.pwaHandler.hideInstallPrompt();
    }
    
    if (e.target.id === 'floatingInstallBtn' || e.target.closest('#floatingInstallBtn')) {
      window.pwaHandler.showInstallPrompt();
    }
  });
});
