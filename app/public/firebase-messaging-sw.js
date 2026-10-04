importScripts('/__/firebase/9.1.3/firebase-app-compat.js');
importScripts('/__/firebase/9.1.3/firebase-messaging-compat.js');
importScripts('/__/firebase/init.js');

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
