// 🔔 Firebase Service Worker para notificaciones push
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// ⚙️ Configuración pública de tu proyecto Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAlxd5_JKB7Fw5b9XES4bxECXQwvZjEu64",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.appspot.com",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8cab32b4b76b7de5b428e", // 👈 corregido
  measurementId: "G-NQ27P4V8XY", // 👈 corregido
});

// Inicializa Firebase Messaging en el SW
const messaging = firebase.messaging();

// 📩 Manejo de notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("📩 [BúhoLex] Mensaje en background:", payload);

  const notificationTitle = payload.notification?.title || "BúhoLex";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación",
    icon: "/favicon.ico",
    badge: "/favicon.ico", // icono pequeño en la barra de estado
    data: payload.data || {}, // datos extra (para deep linking)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 📌 Manejo de clics en notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        // Reutiliza la pestaña abierta
        return clientList[0].focus();
      }
      // O abre una nueva pestaña hacia tu app
      return clients.openWindow("/");
    })
  );
});
