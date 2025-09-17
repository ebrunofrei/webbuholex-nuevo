/* /public/firebase-messaging-sw.js */

/* Tomar control rápido */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* Usar compat en el SW (JS clásico, no ESM) */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

/* Inicializa SOLO con el senderId (suficiente en el SW) */
firebase.initializeApp({
  messagingSenderId: "608455352779"
});

const messaging = firebase.messaging();

/* Notificaciones cuando la app está cerrada / en background */
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Notificación";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

/* Click en notificación: enfocar o abrir */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = self.location.origin || "/";
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.startsWith(base)) { c.focus(); return; }
    }
    await self.clients.openWindow(base);
  })());
});
