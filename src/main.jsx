// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// --- Render principal ---
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

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
