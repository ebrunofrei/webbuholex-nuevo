/* eslint-disable no-undef */
// ============================================================
// 🦉 BÚHOLEX | Firebase Messaging SW (robusto y silencioso)
// - Compat v9 (importScripts ...-compat.js)
// - Toma control inmediato (skipWaiting + clients.claim)
// - Guardas defensivos: no rompe si FCM falla/está bloqueado
// - Evita duplicados: si llega "notification", no re-renderiza
// - Click: enfoca pestaña si existe; si no, abre URL
// - Permite desactivar push desde registro con ?enablePush=false
//   (útil mientras arreglas FCM 403 en PROD)
// ============================================================

// 1) Librerías compat (v9.x)
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// 2) Toma control del SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// 3) Flag para habilitar/deshabilitar notificaciones desde el registro:
//    navigator.serviceWorker.register('/firebase-messaging-sw.js?enablePush=false')
function getBoolFromQuery(name, defVal) {
  try {
    const u = new URL(self.location.href);
    const v = u.searchParams.get(name);
    if (v == null) return defVal;
    return String(v).toLowerCase() === "true";
  } catch { return defVal; }
}
const ENABLE_PUSH = getBoolFromQuery("enablePush", true);

// 4) Inicializar Firebase (SW no puede leer import.meta.env)
try {
  firebase.initializeApp({
    apiKey: "AIzaSyDOMhMqkNzpHC-6Lex6c-vDR_Sb3oev0HE",
    authDomain: "buholex-ab588.firebaseapp.com",
    projectId: "buholex-ab588",
    storageBucket: "buholex-ab588.appspot.com",
    messagingSenderId: "608453552779",
    appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
    measurementId: "G-NQQZ7P48YX",
  });
} catch (e) {
  // Si ya estaba inicializado o falla por bloqueo, no detengas el SW
}

// 5) Obtener Messaging (defensivo)
let messaging = null;
try {
  messaging = firebase.messaging?.();
} catch {
  // En algunos navegadores sin soporte, simplemente no habrá messaging
}

// Helper: normaliza/compone notificación
function showSafeNotification({ title, body, icon, badge, data }) {
  try {
    const t = title || "BúhoLex";
    const b = body || "";
    const i = icon || "/icons/icon-192.png";
    const bdg = badge || "/icons/icon-192.png";
    return self.registration.showNotification(t, {
      body: b,
      icon: i,
      badge: bdg,
      data: data || {},
    });
  } catch {
    // Ignorar si falla
  }
}

// 6) Background messages (data-only). Si llega "notification", FCM ya mostró banner.
if (ENABLE_PUSH && messaging && messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage((payload) => {
    // Debug visible en Application > Service Workers
    // console.log("[SW] Background message:", payload);

    const notif = payload?.notification || {};
    const data = payload?.data || {};

    // Si el servidor ya mandó "notification", evita duplicar.
    if (notif && (notif.title || notif.body)) return;

    const title = data.title;
    const body  = data.body;
    const icon  = data.icon;
    const badge = data.badge;
    const url   = data.url || data.link || "/";

    showSafeNotification({
      title, body, icon, badge,
      data: { url, ...data },
    });
  });
}

// 7) Click en notificación: enfoca si hay una ventana con el mismo base-path; si no, abre.
self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();

  const raw = (event.notification?.data && event.notification.data.url) || "/";
  const targetUrl = (() => {
    try { return new URL(raw, self.location.origin).toString(); }
    catch { return "/"; }
  })();
  const targetBase = targetUrl.split("#")[0].split("?")[0].replace(/\/+$/, "");

  event.waitUntil((async () => {
    try {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const match = clientList.find((c) => {
        try {
          const u = new URL(c.url);
          const base = (u.origin + u.pathname).replace(/\/+$/, "");
          return base === targetBase || base.startsWith(targetBase) || targetBase.startsWith(base);
        } catch { return false; }
      });

      if (match && "focus" in match) {
        await match.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    } catch {
      // Si falla, al menos intenta abrir nueva ventana
      try { await self.clients.openWindow(targetUrl); } catch {}
    }
  })());
});

// 8) Fallback para eventos 'push' raw (algunos proveedores externos)
self.addEventListener("push", (event) => {
  if (!ENABLE_PUSH) return;
  if (!event?.data) return;

  try {
    const payload = event.data.json();
    const notif = payload?.notification || {};
    const data = payload?.data || {};

    // Si ya hay "notification", evita duplicar
    if (notif && (notif.title || notif.body)) return;

    const title = data.title;
    const body  = data.body;
    const icon  = data.icon;
    const badge = data.badge;
    const url   = data.url || "/";

    event.waitUntil(
      showSafeNotification({
        title, body, icon, badge,
        data: { url, ...data },
      })
    );
  } catch {
    // Si no es JSON válido, ignorar
  }
});
