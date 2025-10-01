// /public/firebase-messaging-sw.js
/* eslint-disable no-undef */

// 1) Librerías compat para SW
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// 2) Control inmediato del SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// 3) Inicializa Firebase con toda la config (NO solo senderId)
firebase.initializeApp({
  apiKey: "AIzaSyDOMhMqkNzpHC-6Lex6c-vDR_Sb3oev0HE",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.appspot.com",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
  measurementId: "G-NQQZ7P48YX",
});

// 4) Inicializa messaging
const messaging = firebase.messaging();

/**
 * Listener de mensajes cuando la app está en segundo plano.
 * - Si el payload incluye "notification", FCM muestra la notificación automáticamente
 *   y NO se llama a onBackgroundMessage.
 * - Si envías solo "data", este handler debe mostrar la notificación.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("📩 [firebase-messaging-sw] Background message:", payload);

  const notif = payload?.notification || {};
  const data = payload?.data || {};

  const notificationTitle = notif.title || "Notificación";
  const notificationOptions = {
    body: notif.body || "",
    icon: notif.icon || "/favicon.ico",
    badge: notif.badge || "/favicon.ico",
    data: {
      url: data.url || data.link || notif.click_action || "/",
      ...data,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Click en la notificación:
 *  - Enfoca una pestaña existente si la hay
 *  - Si no, abre la URL (data.url) o la home por defecto
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification?.data && event.notification.data.url) ||
    self.location.origin + "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const client =
        allClients.find((c) => c.url.startsWith(targetUrl)) ||
        allClients.find((c) => c.url.startsWith(self.location.origin));

      if (client) return client.focus();
      return self.clients.openWindow(targetUrl);
    })()
  );
});
