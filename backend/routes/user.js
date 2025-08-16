import express from "express";
const router = express.Router();
import jwt from "jsonwebtoken";

// Simulación: deberías tener tu propia lógica de users y membresía
router.get('/membership', (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.json({ isPro: false });
    const token = auth.split(' ')[1];
    // Valida el token (coloca tu SECRET real)
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Simulación: payload tiene { id, email, isPro, ... }
    // En la vida real: busca el usuario en tu base de datos y retorna membership real
    return res.json({ isPro: payload.isPro === true });
  } catch (e) {
    return res.json({ isPro: false });
  }
});

export default router;
