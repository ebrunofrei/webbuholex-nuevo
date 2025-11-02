/* eslint-disable no-undef */

// 1) Librerías compat para SW (v9.x)
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// 2) Toma control inmediato del SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// 3) Inicializa Firebase (SW no puede leer import.meta.env)
firebase.initializeApp({
  apiKey: "AIzaSyDOMhMqkNzpHC-6Lex6c-vDR_Sb3oev0HE",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.appspot.com",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
  measurementId: "G-NQQZ7P48YX",
});

// 4) Inicializa Messaging
const messaging = firebase.messaging();

/**
 * onBackgroundMessage:
 * - Solo se invoca con payloads "data-only".
 * - Si llega "notification", FCM muestra el banner y NO pasa por aquí.
 */
messaging.onBackgroundMessage((payload) => {
  // Debug visible en Application > Service Workers
  console.log("[SW] Background message:", payload);

  const notif = payload?.notification || {};
  const data = payload?.data || {};

  // Si el servidor ya mandó "notification", evita duplicar
  if (notif && (notif.title || notif.body)) {
    // Normalmente no se ejecuta este bloque por el comportamiento de FCM,
    // pero lo dejamos como guard para proveedores no estándar.
    return;
  }

  const title = data.title || "BúhoLex";
  const body  = data.body  || "";
  const icon  = data.icon  || "/icons/icon-192.png";
  const badge = data.badge || "/icons/icon-192.png";
  const url   = data.url   || data.link || "/";

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    data: { url, ...data },
  });
});

/**
 * Click en notificación:
 * - Enfoca una ventana existente con misma origen/URL base.
 * - Si no existe, abre una nueva.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const raw = (event.notification?.data && event.notification.data.url) || "/";
  // Normaliza para comparar sin query/hash
  const targetUrl = new URL(raw, self.location.origin).toString();
  const targetBase = targetUrl.split("#")[0].split("?")[0];

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    // Busca cliente que empiece con mismo origen y path base
    const match = clients.find((c) => {
      try {
        const u = new URL(c.url);
        const base = (u.origin + u.pathname).replace(/\/+$/, "");
        const tgt  = targetBase.replace(/\/+$/, "");
        return base === tgt || base.startsWith(tgt) || tgt.startsWith(base);
      } catch {
        return false;
      }
    });

    if (match) {
      await match.focus();
      return;
    }
    await self.clients.openWindow(targetUrl);
  })());
});

/**
 * Fallback opcional: algunos envíos "raw" disparan 'push' sin pasar por FCM handler.
 * Si no quieres fallback, elimina este bloque.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const notif = payload?.notification || {};
    const data = payload?.data || {};

    // Evita duplicar si ya hay "notification"
    if (notif && (notif.title || notif.body)) return;

    const title = data.title || "BúhoLex";
    const body  = data.body  || "";
    const icon  = data.icon  || "/icons/icon-192.png";
    const badge = data.badge || "/icons/icon-192.png";
    const url   = data.url   || "/";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        data: { url, ...data },
      })
    );
  } catch (e) {
    // Si no es JSON, ignora
  }
});
