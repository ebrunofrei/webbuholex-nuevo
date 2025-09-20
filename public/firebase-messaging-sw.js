// /public/firebase-messaging-sw.js

// Forzar control inmediato del SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Importa compatibilidad Firebase (para SW)
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Inicializa Firebase solo con senderId (para FCM en SW basta esto)
firebase.initializeApp({
  messagingSenderId: "608453552779", // 👈 tu Sender ID real
});

// Inicializa messaging
const messaging = firebase.messaging();

/**
 * Listener de mensajes cuando la app está en segundo plano
 * (ej: pestaña cerrada o no activa)
 */
messaging.onBackgroundMessage((payload) => {
  console.log("📩 [firebase-messaging-sw.js] Mensaje en background:", payload);

  const notificationTitle = payload?.notification?.title || "Notificación";
  const notificationOptions = {
    body: payload?.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: payload?.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Maneja el click en la notificación
 * → Enfoca la pestaña si ya está abierta, si no la abre
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const appUrl = self.location.origin + "/";
      const client = allClients.find((c) => c.url.startsWith(appUrl));

      if (client) {
        client.focus();
      } else {
        await self.clients.openWindow(appUrl);
      }
    })()
  );
});
