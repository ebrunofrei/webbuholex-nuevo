/* public/firebase-messaging-sw.js */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// ⚠️ Usa tu senderId real:
firebase.initializeApp({ messagingSenderId: "608455352779" });

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Notificación";
    const options = {
      body: payload.notification?.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: payload.data || {}
    };
    self.registration.showNotification(title, options);
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = self.location.origin || "/";
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) if (c.url.startsWith(url)) return c.focus();
      return self.clients.openWindow(url);
    })());
  });
} catch (err) {
  // Si hay error de evaluación, lo verás aquí
  console.error("SW FCM error:", err);
}
