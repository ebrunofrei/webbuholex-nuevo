// src/services/fcmTokenService.js
import { db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Guarda el token FCM en Firestore asociado al usuario
 * @param {string} uid - ID del usuario autenticado
 * @param {string} token - Token FCM
 */
export async function guardarTokenFCM(uid, token) {
  if (!uid || !token) return;

  try {
    const ref = doc(db, "fcmTokens", uid); // 📂 tokens guardados por usuario
    await setDoc(ref, { token, actualizado: new Date() }, { merge: true });
    console.log("✅ Token FCM guardado en Firestore:", uid, token);
  } catch (err) {
    console.error("❌ Error guardando token FCM:", err);
  }
}
