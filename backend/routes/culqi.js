import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import { Router } from "express";
import axios from "axios";

const router = Router();

// 🔑 Llave privada desde .env
const CULQI_PRIVATE_KEY = process.env.CULQI_PRIVATE_KEY;

/**
 * 💳 Crear un cargo en Culqi
 * Body esperado: { token, email, amount }
 */
router.post("/charge", async (req, res) => {
  try {
    const { token, email, amount } = req.body;

    // --- Validaciones básicas ---
    if (!token || !email || !amount) {
      return res.status(400).json({
        ok: false,
        error: "Faltan campos requeridos (token, email, amount).",
      });
    }

    if (!CULQI_PRIVATE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "CULQI_PRIVATE_KEY no está configurada en el servidor.",
      });
    }

    // --- Request a Culqi ---
    const response = await axios.post(
      "https://api.culqi.com/v2/charges",
      {
        amount: parseInt(amount, 10), // 💰 Monto en céntimos
        currency_code: "PEN",
        email,
        source_id: token,
        description: "Suscripción BúhoLex PRO",
      },
      {
        headers: {
          Authorization: `Bearer ${CULQI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      ok: true,
      charge: response.data,
    });
  } catch (error) {
    console.error("Error al crear cargo Culqi:", error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      ok: false,
      error: error.response?.data || error.message,
    });
  }
});

export default router;
