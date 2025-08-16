import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // <-- AGREGAR

const firebaseConfig = {
  apiKey: "AIzaSyAlxd5_JKB7Fw5b9XES4bxECXQwvZjEu64",
  authDomain: "buholex-ab588.firebaseapp.com",
  projectId: "buholex-ab588",
  storageBucket: "buholex-ab588.firebasestorage.app",
  messagingSenderId: "608453552779",
  appId: "1:608453552779:web:8ca82b34b76bf7de5b428e"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // <-- AGREGADO
