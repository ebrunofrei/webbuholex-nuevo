// --- Polyfill de process para evitar "process is not defined" en algunos bundles
import "./process-shim";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/noticias.css";

// Render principal
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registro del Service Worker de Firebase Messaging
(function registerFCMServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    /^192\.168\./.test(location.hostname) ||
    /^10\./.test(location.hostname);

  if (!isLocalhost && location.protocol !== "https:") {
    console.warn("FCM requiere HTTPS fuera de localhost.");
    return;
  }

  const doRegister = () =>
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then((reg) => {
        // Evita multiple logs con HMR
        if (!window.__FCM_SW_REGISTERED__) {
          console.log("✅ Service Worker FCM registrado:", reg);
          window.__FCM_SW_REGISTERED__ = true;
        }
        // Exponer para depuración si se requiere pedir token luego
        window._fcmSWReg = reg;

        // Manejo básico de actualizaciones
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                // Si hay waiting worker, el SW nuevo está listo
                if (navigator.serviceWorker.controller) {
                  console.log("ℹ️ FCM SW actualizado. Recarga para usar la nueva versión.");
                }
              }
            });
          }
        });

        return reg;
      })
      .catch((err) => {
        console.error("❌ Error al registrar el Service Worker FCM:", err);
      });

  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister, { once: true });
  }
})();
