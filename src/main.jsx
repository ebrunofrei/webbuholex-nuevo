// --- (Opcional) Polyfill de process si tu build lo necesita ---
import "./process-shim";

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import { initPushClient } from "@/services/pushClient.js";

import "./index.css";
import "./styles/noticias.css";

/* ===================================================================
 * 🧩 Crear el root UNA SOLA VEZ (HMR-safe)
 * =================================================================== */
const container = document.getElementById("root");
if (!window.__BUHOLEX_ROOT__) {
  window.__BUHOLEX_ROOT__ = createRoot(container);
}
const root = window.__BUHOLEX_ROOT__;

/* ===================================================================
 * 🚀 Render principal (idempotente)
 * =================================================================== */
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// No desmontar el root en HMR (evita removeChild/insertBefore)
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    // Intencionalmente vacío
  });
}

/* ===================================================================
 * ⚙️ Configuración Push/FCM (condicional por ENV)
 * - VITE_ENABLE_FCM=false → no registra SW ni obtiene token (y limpia si hubiera)
 * - VITE_ENABLE_PUSH=true → fuerza sólo notificaciones locales (si tu cliente lo usa)
 * - VITE_FCM_VAPID_KEY    → requerido si ENABLE_FCM=true y vas por FCM real
 * =================================================================== */

const ENABLE_PUSH = String(import.meta.env.VITE_ENABLE_PUSH || "").toLowerCase() === "true";

const ENABLE_FCM = String(import.meta.env.VITE_ENABLE_FCM || "").toLowerCase() === "true";
if (!ENABLE_FCM && import.meta.env.DEV) {
  const origInfo = console.info;
  console.info = (...args) => {
    if (String(args[0] || "").includes("FCM deshabilitado")) return;
    origInfo(...args);
  };
}


/** Desregistra cualquier SW previo de FCM si FCM está deshabilitado */
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

/** Registra el SW de FCM si procede */
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

/** Inicializa FCM de forma segura (no bloquea si no hay permisos) */
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

    // Ajusta a tu inicialización real:
    const { messaging, getToken } = await import("./firebase.js");

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.warn("FCM: no se obtuvo token.");
      return;
    }
    console.log("FCM token:", token.slice(0, 8) + "…");
    // TODO: enviar token a tu backend si aplica
  } catch (err) {
    console.warn("FCM desactivado/bloqueado:", err?.message || err);
  }
}

/* ===================================================================
 * ⏱️ Post-load: registra/limpia SW y luego inicializa FCM
 * =================================================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    await maybeRegisterFCMServiceWorker();
    await safeInitFCM();
  });
}

/* ===================================================================
 * 🔔 Inicialización de PushClient (una sola vez)
 * - Si usas sólo FCM real: bastaría con ENABLE_FCM
 * - Si también usas notificaciones locales: ENABLE_PUSH
 * =================================================================== */
if (ENABLE_FCM || ENABLE_PUSH) {
  initPushClient({
    swUrl: "/firebase-messaging-sw.js",
    enablePushParam: ENABLE_PUSH ? "true" : (import.meta.env.VITE_ENABLE_PUSH || "false"),
  });
}
