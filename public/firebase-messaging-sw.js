// public/firebase-messaging-sw.js

// Toma control inmediato
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Compat en SW (JS clásico)
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Usa tu senderId real
firebase.initializeApp({
  messagingSenderId: "608455352779",
});

const messaging = firebase.messaging();

// Notificaciones cuando la app no está al frente
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Notificación";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload?.data || {},
  };
  self.registration.showNotification(title, options);
});

// Click en la notificación → enfoca o abre la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = self.location.origin + "/";
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        if (c.url.startsWith(url)) { c.focus(); return; }
      }
      await self.clients.openWindow(url);
    })()
  );
});
