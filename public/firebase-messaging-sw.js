// public/firebase-messaging-sw.js

// Importa los SDK compat de Firebase (necesarios en SW)
importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.17.1/firebase-messaging-compat.js");

// ⚠️ En un Service Worker NO se puede usar import.meta.env ni process.env
// Aquí debes poner los valores directamente (copiados de tu .env.local)
// o cargarlos desde Vite reemplazando en build si prefieres.

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
});

// Inicializar Messaging
const messaging = firebase.messaging();

// Listener para notificaciones en background
messaging.onBackgroundMessage((payload) => {
  console.log("📲 Mensaje recibido en background:", payload);

  const notificationTitle = payload.notification?.title || "BúhoLex Notificación";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
