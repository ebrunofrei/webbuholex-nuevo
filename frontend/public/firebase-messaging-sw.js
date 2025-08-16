// /public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAlxd5_JKB7Fw5b9XES4bxECXQwvZjEu64",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.firebasestorage.app",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e",
  measurementId: "G-NQQZ7P48YX"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/favicon.ico"
    }
  );
});
