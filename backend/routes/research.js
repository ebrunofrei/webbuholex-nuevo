// backend/routes/research.js
import { Router } from "express";
import { researchHealth, researchSearch } from "../services/research/index.js";

const router = Router();

router.get("/health", (_req, res) => {
  return res.json(researchHealth());
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const tipo = String(req.query.tipo || "general");
    if (!q.trim()) {
      return res.status(400).json({ ok: false, code: "RESEARCH_BAD_REQUEST", error: "Falta parámetro q" });
    }
    const results = await researchSearch({ q, tipo });
    return res.json({ ok: true, results });
  } catch (err) {
    const code = err.code || "RESEARCH_ERROR";
    const status =
      code === "RESEARCH_DISABLED" ? 501 :
      code === "RESEARCH_BAD_REQUEST" ? 400 : 500;
    return res.status(status).json({ ok: false, code, error: err.message || String(err) });
  }
});

export default router;
