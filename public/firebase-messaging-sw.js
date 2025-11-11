/* eslint-disable no-undef */
// ============================================================
// 🦉 BÚHOLEX | Firebase Messaging SW (compat v9, robusto)
// - Usa SDK COMPAT (importScripts) → válido en SW
// - Control inmediato (skipWaiting + clients.claim)
// - Silencioso si FCM falla/está bloqueado
// - Evita duplicados si el payload ya trae `notification`
// - Click: enfoca pestaña abierta o abre URL segura
// - Flag ?enablePush=false en el registro para apagar notificaciones
// ============================================================

// 1) SDKs COMPAT (no modulares) — ¡NO usar `import`/ESM aquí!
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// 2) Tomar control del SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// 3) Leer bandera de query (?enablePush=true/false)
function getBoolFromQuery(name, defVal) {
  try {
    const v = new URL(self.location.href).searchParams.get(name);
    return v == null ? defVal : String(v).toLowerCase() === "true";
  } catch { return defVal; }
}
const ENABLE_PUSH = getBoolFromQuery("enablePush", true);

// 4) Inicializar Firebase (SW NO puede leer import.meta.env)
try {
  firebase.initializeApp({
    apiKey: "AIzaSyDOMhMqkNzpHC-6Lex6c-vDR_Sb3oev0HE",
    authDomain: "buholex-ab588.firebaseapp.com",
    projectId: "buholex-ab588",
    storageBucket: "buholex-ab588.appspot.com",
    messagingSenderId: "608453552779",
    appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
    // measurementId no se usa en SW
  });
} catch (e) {
  // Si ya estaba inicializado o el navegador bloquea, no romper el SW
}

// 5) Obtener messaging de forma segura
let messaging = null;
try { messaging = firebase.messaging?.(); } catch { /* sin soporte */ }

// 6) Helper: mostrar notificación de forma segura
function showSafeNotification(opts = {}) {
  try {
    const title = opts.title || "BúhoLex";
    const body  = String(opts.body || "");
    const icon  = opts.icon  || "/icons/icon-192.png";
    const badge = opts.badge || "/icons/icon-192.png";
    const data  = opts.data  || {};
    if (!self?.registration?.showNotification) return;
    return self.registration.showNotification(title, { body, icon, badge, data });
  } catch { /* silencioso */ }
}

// 7) Mensajes “data-only” en segundo plano
if (ENABLE_PUSH && messaging?.onBackgroundMessage) {
  messaging.onBackgroundMessage((payload) => {
    const notif = payload?.notification || {};
    const data  = payload?.data || {};

    // Si ya viene `notification`, el propio FCM muestra el banner → evita duplicar
    if (notif && (notif.title || notif.body)) return;

    const url = data.url || data.link || "/";

    showSafeNotification({
      title: data.title,
      body:  data.body,
      icon:  data.icon,
      badge: data.badge,
      data:  { url, ...data },
    });
  });
}

// 8) Click en notificación: enfoca pestaña existente o abre URL
self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();

  const raw = (event.notification?.data && event.notification.data.url) || "/";
  let targetUrl = "/";
  try { targetUrl = new URL(raw, self.location.origin).toString(); } catch {}

  const targetBase = targetUrl.split("#")[0].split("?")[0].replace(/\/+$/, "");

  event.waitUntil((async () => {
    try {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const match = clientsList.find((c) => {
        try {
          const u = new URL(c.url);
          const base = (u.origin + u.pathname).replace(/\/+$/, "");
          return base === targetBase || base.startsWith(targetBase) || targetBase.startsWith(base);
        } catch { return false; }
      });

      if (match && "focus" in match) { await match.focus(); return; }
      await self.clients.openWindow(targetUrl);
    } catch {
      try { await self.clients.openWindow(targetUrl); } catch {}
    }
  })());
});

// 9) Fallback para `push` genérico (otros proveedores)
self.addEventListener("push", (event) => {
  if (!ENABLE_PUSH || !event?.data) return;
  try {
    const payload = event.data.json();
    const notif = payload?.notification || {};
    const data  = payload?.data || {};
    if (notif && (notif.title || notif.body)) return; // evitar doble banner

    const url = data.url || "/";
    event.waitUntil(showSafeNotification({
      title: data.title,
      body:  data.body,
      icon:  data.icon,
      badge: data.badge,
      data:  { url, ...data },
    }));
  } catch { /* silencioso */ }
});
