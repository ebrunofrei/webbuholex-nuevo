// --- (Opcional) Polyfill de process si tu build lo necesita ---
import "./process-shim";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/noticias.css";

/* ===================================================================
 * ⚙️ Configuración FCM (opcional por ENV)
 * - VITE_ENABLE_FCM=false   → no registra SW ni obtiene token (y limpia si hubiera)
 * - VITE_FCM_VAPID_KEY      → sólo requerido si ENABLE_FCM=true
 * =================================================================== */
const ENABLE_FCM = String(import.meta.env.VITE_ENABLE_FCM || "").toLowerCase() === "true";
// Si quieres bloquear FCM en localhost, descomenta:
// const IS_LOCALHOST = /^localhost(:\d+)?$/.test(window.location.host);
// const ENABLE_FCM = ENABLE_FCM && !IS_LOCALHOST;

/* ===================================================================
 * 🧼 Util: desregistrar cualquier SW previo de Firebase Messaging
 * =================================================================== */
async function unregisterFCMSwIfAny() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const tasks = regs
      .filter((r) => r?.active?.scriptURL?.includes?.("firebase-messaging-sw.js"))
      .map((r) => r.unregister());
    await Promise.all(tasks);
    if (tasks.length) console.info("🧹 FCM: service worker desregistrado por configuración.");
  } catch (e) {
    console.debug("FCM: no se pudo desregistrar SW:", e);
  }
}

/* ===================================================================
 * 🚀 Registro condicional del SW de FCM
 * - No registra si ENABLE_FCM=false o contexto no seguro
 * - Usa versión para bust de caché (sin romper si no existe la constante)
 * =================================================================== */
async function maybeRegisterFCMServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!ENABLE_FCM) {
    await unregisterFCMSwIfAny();
    console.info("ℹ️ FCM deshabilitado por ENV (VITE_ENABLE_FCM=false).");
    return;
  }

  if (window.isSecureContext !== true && location.protocol !== "https:") {
    console.warn("⚠️ Contexto no seguro: omitimos registro de FCM SW.");
    return;
  }

  const BUILD_VER =
    typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : Date.now();

  const swUrl = `/firebase-messaging-sw.js?v=${BUILD_VER}`;
  try {
    const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    console.log("✅ FCM SW registrado:", reg);
  } catch (err) {
    console.error("❌ Error registrando FCM SW:", err);
  }
}

/* ===================================================================
 * 🔐 Inicialización segura de FCM
 * - No solicita permiso; sólo continúa si YA está "granted"
 * - No intenta getToken si no hay SW listo
 * - Importa Firebase dinámicamente (code-splitting)
 * =================================================================== */
async function safeInitFCM() {
  try {
    if (!ENABLE_FCM) return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    if (Notification.permission !== "granted") {
      console.info("FCM: permiso no concedido; no se inicializa.");
      return;
    }

    const reg = await navigator.serviceWorker.ready;

    // Ajusta la ruta a tu inicialización real de Firebase/Messaging:
    const { messaging, getToken } = await import("./firebase.js");

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.warn("FCM: no se obtuvo token.");
      return;
    }
    // TODO: envía el token a tu backend si lo necesitas
    console.log("FCM token:", token.slice(0, 8) + "…");
  } catch (err) {
    // Nunca lanzar: no debe romper UX en móvil (403, bloqueos, etc.)
    console.warn("FCM desactivado/bloqueado:", err?.message || err);
  }
}

/* ===================================================================
 * 🧩 Render principal de la app
 * =================================================================== */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* ===================================================================
 * ⏱️ Hook onload: registrar/limpiar SW y luego inicializar FCM (si aplica)
 * =================================================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    await maybeRegisterFCMServiceWorker(); // registra o limpia según ENV
    await safeInitFCM();                   // sólo corre si ENABLE_FCM y permiso "granted"
  });
}
