// backend/routes/usuarios.js
import { Router } from "express";
const router = Router();

router.get("/", (req, res) => {
  res.json({ ok: true, msg: "Ruta usuarios en construcción" });
});

export default router;
