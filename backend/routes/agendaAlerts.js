// ============================================================
// 🦉 BÚHOLEX – AGENDA ALERTS (Fase A Enterprise · LIBRE)
// ------------------------------------------------------------
// - DOS endpoints: /alertas-live y /alertas
// - Agenda LIBRE por defecto (sin expediente)
// - Soporta expedienteId opcional (IA / casos)
// - Sin persistencia, sin lógica duplicada
// ============================================================

import express from "express";
import {
  buildAlertWindow,
  computeAgendaAlert,
} from "../services/agenda/alerts.js";
import { findAgendaAlertCandidates } from "../services/agenda/repo.js";

const router = express.Router();

/* ============================================================
   🟢 1. ALERTAS LIVE (tiempo real)
   ------------------------------------------------------------
   GET /api/agenda/alertas-live?usuarioId=...&horizonSeconds=...&expedienteId=?
   ============================================================ */
router.get("/alertas-live", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, error: "Falta usuarioId" });
    }

    // expedienteId ES OPCIONAL
    const expedienteId = req.query.expedienteId
      ? String(req.query.expedienteId).trim()
      : null;

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
      expedienteId,
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
        alert: info,
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
    return res
      .status(500)
      .json({ ok: false, error: err?.message || String(err) });
  }
});

/* ============================================================
   🔵 2. ALERTAS PRODUCCIÓN (estable)
   ------------------------------------------------------------
   GET /api/agenda/alertas?usuarioId=...&expedienteId=?
   ============================================================ */
router.get("/alertas", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) {
      return res.status(400).json({ ok: false, error: "Falta usuarioId" });
    }

    // expedienteId OPCIONAL
    const expedienteId = req.query.expedienteId
      ? String(req.query.expedienteId).trim()
      : null;

    const nowUnix = Math.floor(Date.now() / 1000);
    const DEFAULT_HORIZON = 24 * 60 * 60; // 24h

    const win = buildAlertWindow(nowUnix, DEFAULT_HORIZON);
    if (!win) {
      return res.json({ ok: true, nowUnix, alerts: [] });
    }

    const candidates = await findAgendaAlertCandidates({
      usuarioId,
      expedienteId,
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
    return res
      .status(500)
      .json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
