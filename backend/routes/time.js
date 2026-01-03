// backend/routes/time.js
import express from "express";
import { getNowPayload } from "../services/timeService.js";

const router = express.Router();

// GET /api/time/now?tz=America/Lima&locale=es-PE
router.get("/now", (req, res) => {
  const tz = req.query.tz;
  const locale = req.query.locale;

  const payload = getNowPayload({ tz, locale });

  res.setHeader("Cache-Control", "no-store");
  return res.json(payload);
});

export default router;
