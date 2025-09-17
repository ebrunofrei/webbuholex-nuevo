// /public/firebase-messaging-sw.js

// Importa los scripts de Firebase directamente desde CDN
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging.js");

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

// Inicializa el servicio de mensajería
const messaging = firebase.messaging();

// Maneja mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("📩 Recibido en background:", payload);

  const notificationTitle = payload.notification?.title || "BúhoLex";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva notificación.",
    icon: "/favicon.ico",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
