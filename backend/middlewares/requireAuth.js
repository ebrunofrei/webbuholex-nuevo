// backend/middlewares/requireAuth.js
import admin from "../services/myFirebaseAdmin.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Token no proporcionado" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Token inválido" });
  }
}
