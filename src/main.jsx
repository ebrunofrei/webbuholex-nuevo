/* global __BUILD_VERSION__ */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/noticias.css";

// Flags por entorno
const ENABLE_FCM = String(import.meta.env.VITE_ENABLE_FCM || "").toLowerCase() === "true";

// Exponer diagnóstico simple
window.__APP_INFO__ = {
  BUILD_VERSION:
    (typeof __BUILD_VERSION__ !== "undefined" && __BUILD_VERSION__) ||
    (import.meta.env.VITE_BUILD_VERSION || `dev-${Date.now()}`),
  MODE: import.meta.env.MODE,
  VITE_API_BASE: import.meta.env.VITE_API_BASE || "",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
};

// Limpieza de SW FCM antiguos
async function unregisterFCMSwIfAny() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => r.active?.scriptURL?.includes("firebase-messaging-sw.js"))
        .map((r) => r.unregister())
    );
  } catch {}
}

// Registro condicional del SW de FCM
async function maybeRegisterFCMServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (!ENABLE_FCM) {
    await unregisterFCMSwIfAny();
    console.info("FCM deshabilitado (VITE_ENABLE_FCM=false).");
    return;
  }

  if (window.isSecureContext !== true && location.protocol !== "https:") {
    console.warn("Contexto no seguro: se omite FCM.");
    return;
  }

  const version =
    (typeof __BUILD_VERSION__ !== "undefined" && __BUILD_VERSION__) ||
    (import.meta.env.VITE_BUILD_VERSION || Date.now());
  const swUrl = `/firebase-messaging-sw.js?v=${encodeURIComponent(String(version))}`;

  try {
    const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    console.log("SW FCM registrado:", reg);
  } catch (err) {
    console.error("Error registrando SW FCM:", err);
  }
}

// Render
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hook al load: FCM opcional
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void maybeRegisterFCMServiceWorker();
  });
}
