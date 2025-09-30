// routes/membership.js
import { db } from "#services/myFirebaseAdmin.js";
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * 📌 GET /membership
 * Valida el token JWT y devuelve el estado de membresía del usuario.
 */
router.get("/membership", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        isPro: false,
        error: "Token no proporcionado o inválido.",
      });
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        isPro: false,
        error: "Token inválido o expirado.",
      });
    }

    // 🔑 Simulación: payload trae { id, email, isPro }
    // En la práctica: buscar usuario en Firestore
    let isPro = payload.isPro === true;
    let proExpiresAt = null;

    try {
      const userDoc = await db.collection("usuarios").doc(payload.id).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        isPro = userData.isPro === true;
        proExpiresAt = userData.proExpiresAt || null;
      }
    } catch (dbErr) {
      console.warn("⚠️ No se pudo consultar Firestore:", dbErr.message);
    }

    return res.json({
      success: true,
      isPro,
      userId: payload.id,
      email: payload.email || null,
      proExpiresAt, // útil para frontend
    });
  } catch (e) {
    console.error("❌ Error en /membership:", e);
    return res.status(500).json({
      success: false,
      isPro: false,
      error: "Error interno verificando membresía.",
    });
  }
});

export default router;
