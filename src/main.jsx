// --- (Opcional) Polyfill de process si tu build lo necesita ---
import "./process-shim";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/noticias.css";

// ===============================
// ⚙️ Config: FCM opcional por env
// ===============================
const ENABLE_FCM = String(import.meta.env.VITE_ENABLE_FCM || "").toLowerCase() === "true";
// Úsalo si quieres evitar FCM en localhost:
// const IS_LOCALHOST = /^localhost(:\d+)?$/.test(window.location.host);

// ===============================
// 🧼 Util: desregistrar SW de FCM
// ===============================
async function unregisterFCMSwIfAny() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const tasks = regs
      .filter((r) => r.active?.scriptURL?.includes("firebase-messaging-sw.js"))
      .map((r) => r.unregister());
    await Promise.all(tasks);
    if (tasks.length) console.info("🧹 FCM desregistrado por configuración.");
  } catch (e) {
    console.debug("No se pudo desregistrar SW de FCM:", e);
  }
}

// =========================================
// 🚀 Registro condicional del SW de FCM
// =========================================
async function maybeRegisterFCMServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!ENABLE_FCM) {
    // Si está deshabilitado, asegúrate de limpiar cualquier registro previo
    await unregisterFCMSwIfAny();
    console.info("ℹ️ FCM deshabilitado por configuración (VITE_ENABLE_FCM=false).");
    return;
  }

  // Opcional: evita registrar si no es contexto seguro
  if (window.isSecureContext !== true && location.protocol !== "https:") {
    console.warn("⚠️ Entorno no seguro: omitimos registro de FCM.");
    return;
  }

  // Truco anti-caché del SW para forzar actualización cuando hagas deploy
  const swUrl = `/firebase-messaging-sw.js?v=${__BUILD_VERSION__ ?? Date.now()}`;

  try {
    const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    console.log("✅ Service Worker registrado para FCM:", reg);
  } catch (err) {
    console.error("❌ Error al registrar Service Worker FCM:", err);
  }
}

// ===============================
// 🧩 Render principal de la app
// ===============================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ===============================
// ⏱️ Hook al load: FCM opcional
// ===============================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void maybeRegisterFCMServiceWorker();
  });
}
