/* /public/firebase-messaging-sw.js */

// Recomendado: tomar control inmediatamente
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Usa compat en el SW (JS clásico)
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// ✅ Inicializa SOLO con el senderId (suficiente para el SW)
firebase.initializeApp({
  messagingSenderId: "YOUR_SENDER_ID" // ← cambia por 608455352779
});

const messaging = firebase.messaging();

// Notificaciones en segundo plano (app cerrada o en background)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Notificación";
  const options = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// Click en la notificación → enfoca o abre la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = self.location.origin || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(url)) {
          client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
