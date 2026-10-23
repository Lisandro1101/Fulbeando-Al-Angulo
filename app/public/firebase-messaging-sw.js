// Service Worker Build Version: 2026-10-23T22-06-49-427Z
const SW_VERSION = '2026-10-23T22-06-49-427Z';

try {
  importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.1.3/firebase-messaging-compat.js');
} catch (e) {
  console.warn('[firebase-messaging-sw.js] No se pudieron cargar los scripts de Firebase:', e);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'Nueva Notificación';
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/icon-192.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log("Error inicializando Firebase en service worker", e);
}
