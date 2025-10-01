// src/main.jsx
import "./polyfills/process-shim.js";
import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("root");

// --- Usar hydrateRoot si hay HTML pre-renderizado ---
if (container.hasChildNodes()) {
  hydrateRoot(
    container,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// --- Registro del Service Worker de Firebase Messaging ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((registration) => {
        console.log("✅ Service Worker registrado para FCM:", registration);
      })
      .catch((err) => {
        console.error("❌ Error al registrar Service Worker FCM:", err);
      });
  });
}
