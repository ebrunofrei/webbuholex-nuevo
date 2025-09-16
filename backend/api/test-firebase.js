import { db, auth } from "../services/firebaseAdmin.js";

export default async function handler(req, res) {
  try {
    // --- Escribir un "ping" en Firestore ---
    const ref = db.collection("_health").doc("ping");
    await ref.set(
      { at: new Date().toISOString(), status: "ok" },
      { merge: true }
    );

    // --- Verificar que Auth responde ---
    const listUsers = await auth.listUsers(1);

    res.status(200).json({
      ok: true,
      msg: "Firebase Admin conectado correctamente ✅",
      firestoreDoc: ref.id,
      authUser: listUsers.users.length
        ? listUsers.users[0].uid
        : "No hay usuarios en Auth",
    });
  } catch (err) {
    console.error("🔥 Error en test-firebase:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
