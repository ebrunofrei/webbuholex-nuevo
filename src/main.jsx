// src/main.jsx
import "./polyfills/process-shim.js";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement.hasChildNodes()) {
  // ✅ Si el HTML ya viene renderizado desde el servidor (Vercel/SSR)
  hydrateRoot(
    rootElement,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  // ✅ Si es un render en blanco (desarrollo/local)
  import("react-dom/client").then(({ createRoot }) => {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
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
