// Firebase Service Worker para notificaciones push
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// ⚙️ Configuración pública de tu proyecto Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAlxd5_JKB7Fw5b9XES4bxECXQwvZjEu64",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.appspot.com", // ✅ corregido
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
  measurementId: "G-NQQZ7P48YX",
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
    badge: "/favicon.ico", // 🔔 icono pequeño en la barra de estado
    data: payload.data || {}, // incluye data para navegación
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 📌 Manejo de clics en notificación (opcional)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Abre la app si está cerrada o enfoca si ya está abierta
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        return client.focus();
      }
      return clients.openWindow("/"); // 🔗 cambia "/" por la ruta de destino
    })
  );
});
