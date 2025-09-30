// api/test-firebase.js
import { db, auth, storage } from "#services/myFirebaseAdmin.js";

/**
 * 📌 Endpoint de verificación de Firebase Admin
 * - Escribe un "ping" en Firestore
 * - Verifica conexión a Auth
 * - Verifica conexión a Storage (opcional)
 */
export default async function handler(req, res) {
  try {
    // --- 1. Escribir "ping" en Firestore ---
    const ref = db.collection("_health").doc("ping");
    const now = new Date();
    await ref.set(
      { at: now.toISOString(), status: "ok" },
      { merge: true }
    );

    // --- 2. Verificar que Auth responde ---
    const listUsers = await auth.listUsers(1).catch(() => ({ users: [] }));

    // --- 3. Verificar que Storage responde ---
    let storageOk = false;
    try {
      const [buckets] = await storage.getBuckets({ maxResults: 1 });
      storageOk = buckets.length > 0;
    } catch (e) {
      console.warn("⚠️ No se pudo verificar Storage:", e.message);
    }

    return res.status(200).json({
      ok: true,
      msg: "✅ Firebase Admin conectado correctamente",
      firestoreDoc: ref.id,
      lastPing: now.toISOString(),
      authUser: listUsers.users.length
        ? listUsers.users[0].uid
        : "No hay usuarios en Auth",
      storageOk,
    });
  } catch (err) {
    console.error("🔥 Error en /test-firebase:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
