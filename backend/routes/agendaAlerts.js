// ============================================================
// 🦉 BÚHOLEX – AGENDA ALERTS (Fase A Enterprise)
// ------------------------------------------------------------
// - DOS endpoints: /alertas-live (flexible) y /alertas (producción).
// - Coherente 100% con AlertsEngine + Repo refactorizados.
// - Sin campos fantasmas, sin cálculos duplicados.
// - Respuesta limpia, lista para app móvil y escritorio PRO.
// ============================================================

import express from "express";
import {
  buildAlertWindow,
  computeAgendaAlert,
} from "../services/agenda/alerts.js";
import { findAgendaAlertCandidates } from "../services/agenda/repo.js";

const router = express.Router();

/* ============================================================
   🟢 1. ALERTAS LIVE (modo tiempo real)
   ------------------------------------------------------------
   GET /api/agenda/alertas-live?usuarioId=...&horizonSeconds=...
   - Uso flexible para UI reactiva
   - No persiste nada
   - Horizon configurable desde el frontend
   ============================================================ */
router.get("/alertas-live", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, error: "Falta usuarioId" });
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const horizonSeconds = req.query.horizonSeconds
      ? Number(req.query.horizonSeconds)
      : undefined;

    const win = buildAlertWindow(nowUnix, horizonSeconds);
    if (!win) {
      return res.json({ ok: true, nowUnix, alerts: [] });
    }

    const candidates = await findAgendaAlertCandidates({
      usuarioId,
      fromUnix: win.fromUnix,
      toUnix: win.toUnix,
    });

    const alerts = [];

    for (const ev of candidates) {
      const info = computeAgendaAlert(ev, nowUnix);
      if (!info) continue;

      alerts.push({
        id: String(ev._id),
        title: ev.title ?? "Evento",
        description: ev.description ?? "",
        dueLocalDay: ev.dueLocalDay ?? null,

        start: {
          iso: ev.startISO ?? null,
          unix: ev.startUnix ?? null,
        },
        end: {
          iso: ev.endISO ?? null,
          unix: ev.endUnix ?? null,
        },

        minutesBefore: ev.minutesBefore ?? null,
        alert: info, // { kind, risk, remainingSeconds, triggers, endUnix }
      });
    }

    return res.json({
      ok: true,
      nowUnix,
      window: win,
      total: alerts.length,
      alerts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

/* ============================================================
   🔵 2. ALERTAS PRODUCCIÓN (serio, estable, completo)
   ------------------------------------------------------------
   GET /api/agenda/alertas?usuarioId=...
   - Horizon fijo (24h)
   - Estándar enterprise
   - Ideal para backend, móvil, cron futuro (Fase C)
   ============================================================ */
router.get("/alertas", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, error: "Falta usuarioId" });
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const DEFAULT_HORIZON = 24 * 60 * 60; // 24 horas

    const win = buildAlertWindow(nowUnix, DEFAULT_HORIZON);
    if (!win) {
      return res.json({ ok: true, nowUnix, alerts: [] });
    }

    const candidates = await findAgendaAlertCandidates({
      usuarioId,
      fromUnix: win.fromUnix,
      toUnix: win.toUnix,
    });

    const alerts = [];

    for (const ev of candidates) {
      const info = computeAgendaAlert(ev, nowUnix);
      if (!info) continue;

      alerts.push({
        id: String(ev._id),
        name: ev.title ?? "Evento",
        detail: ev.description ?? "",
        dueDay: ev.dueLocalDay ?? null,

        start: {
          iso: ev.startISO ?? null,
          unix: ev.startUnix ?? null,
        },
        end: {
          iso: ev.endISO ?? null,
          unix: ev.endUnix ?? null,
        },

        minutesBefore: ev.minutesBefore ?? null,
        risk: info.risk,
        remainingSeconds: info.remainingSeconds,
        triggers: info.triggers,
      });
    }

    return res.json({
      ok: true,
      nowUnix,
      horizon: DEFAULT_HORIZON,
      window: win,
      total: alerts.length,
      alerts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
