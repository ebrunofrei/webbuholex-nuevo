// routes/culqi.js
import { Router } from "express";
import axios from "axios";

const router = Router();

// Asegúrate de tener CULQI_PRIVATE_KEY en tu .env
const CULQI_PRIVATE_KEY = process.env.CULQI_PRIVATE_KEY;

// Endpoint para crear un cargo en Culqi
router.post('/charge', async (req, res) => {
  const { token, email, amount } = req.body;

  if (!token || !email || !amount) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  try {
    const response = await axios.post(
      "https://api.culqi.com/v2/charges",
      {
        amount: parseInt(amount, 10), // Monto en céntimos
        currency_code: "PEN",
        email,
        source_id: token,
        description: "Suscripción BúhoLex PRO"
      },
      {
        headers: {
          Authorization: `Bearer ${CULQI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json({ ok: true, charge: response.data });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.response?.data || error.message });
  }
});

export default router;
