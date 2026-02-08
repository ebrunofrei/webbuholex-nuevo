// ============================================================
// 🗓️ BÚHOLEX – AGENDA EVENTOS (MANUALES / LIBRES)
// ------------------------------------------------------------
// CANONICAL ROUTER — ENTERPRISE
//
// PRINCIPIOS:
// - Agenda LIBRE (solo usuarioId)
// - SIN sessionId / caseId
// - Backend valida pero NO reinventa contrato
// - Compatible con frontend canónico
// ============================================================

import express from "express";
import AgendaEvent from "../models/AgendaEvent.js";
import { enviarWhatsApp } from "#services/whatsappService.js";
import { logWhatsApp } from "#services/whatsappLoggerFirebase.js";

const router = express.Router();
const DEFAULT_TZ = "America/Lima";

/* ============================================================
 * Utils
 * ========================================================== */

function assertISODate(s, name) {
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${name} inválido (ISO requerido)`);
  }
  return d;
}

function assertYMD(s, name = "fecha") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
    throw new Error(`${name} inválida (YYYY-MM-DD)`);
  }
  return s;
}

function ymdInTZ(tz, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function unixFromISO(iso) {
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

function looksE164(phone) {
  return /^\+\d{8,15}$/.test(String(phone || "").trim());
}

/* ============================================================
 * GET /api/agenda-eventos/rango
 * ------------------------------------------------------------
 * Agenda LIBRE por rango YYYY-MM-DD
 * ========================================================== */
router.get("/rango", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    if (!usuarioId) throw new Error("usuarioId requerido");
    if (!from || !to) throw new Error("from/to requeridos");

    assertYMD(from, "from");
    assertYMD(to, "to");

    const items = await AgendaEvent.find({
      usuarioId,
      status: "active",
      dueLocalDay: { $gte: from, $lte: to },
    })
      .sort({ dueLocalDay: 1, startUnix: 1 })
      .lean();

    return res.json({ ok: true, items });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e.message });
  }
});

/* ============================================================
 * POST /api/agenda-eventos
 * ------------------------------------------------------------
 * Crear EVENTO MANUAL (AGENDA LIBRE)
 * ========================================================== */
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};

    const usuarioId = String(b.usuarioId || "").trim();
    const tz = String(b.tz || DEFAULT_TZ).trim();
    const title = String(b.title || "").trim();

    if (!usuarioId) throw new Error("usuarioId requerido");
    if (!title) throw new Error("title requerido");

    // ISO obligatorio
    const start = assertISODate(b.startISO, "startISO");
    const end = assertISODate(b.endISO || b.startISO, "endISO");

    // Unix: payload > cálculo
    const startUnix = Number.isFinite(b.startUnix)
      ? Number(b.startUnix)
      : unixFromISO(start);

    const endUnix = Number.isFinite(b.endUnix)
      ? Number(b.endUnix)
      : unixFromISO(end);

    if (!Number.isFinite(startUnix) || !Number.isFinite(endUnix)) {
      throw new Error("startUnix/endUnix inválidos");
    }

    if (endUnix < startUnix) {
      throw new Error("endISO < startISO");
    }

    // dueLocalDay: payload válido > cálculo
    const dueLocalDay =
      b.dueLocalDay && /^\d{4}-\d{2}-\d{2}$/.test(b.dueLocalDay)
        ? b.dueLocalDay
        : ymdInTZ(tz, start);

    const notes = String(b.notes ?? b.description ?? "");

    const doc = await AgendaEvent.create({
      usuarioId,
      title,

      notes,
      description: notes,

      startISO: start.toISOString(),
      endISO: end.toISOString(),
      startUnix,
      endUnix,
      dueLocalDay,

      tz,
      telefono: String(b.telefono || "").trim(),
      alertaWhatsapp: !!b.alertaWhatsapp,

      status: "active",
    });

    // WhatsApp (no bloqueante)
    if (doc.alertaWhatsapp && looksE164(doc.telefono)) {
      try {
        await enviarWhatsApp(
          doc.telefono,
          `🦉 Evento registrado: ${doc.title} (${doc.dueLocalDay})`
        );
        await logWhatsApp({
          usuarioId: doc.usuarioId,
          to: doc.telefono,
          mensaje: doc.title,
          meta: { eventId: String(doc._id) },
        });
      } catch {
        // nunca romper por WhatsApp
      }
    }

    return res.json({ ok: true, item: doc });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e.message });
  }
});

/* ============================================================
 * PUT /api/agenda-eventos/:id/status
 * ========================================================== */
router.put("/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const status = String(req.body?.status || "").trim();

    if (!id) throw new Error("id requerido");
    if (!["active", "done", "canceled"].includes(status)) {
      throw new Error("status inválido");
    }

    const doc = await AgendaEvent.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!doc) throw new Error("Evento no encontrado");

    return res.json({ ok: true, item: doc });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e.message });
  }
});

/* ============================================================
 * DELETE /api/agenda-eventos/:id
 * ========================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const usuarioId = String(req.query.usuarioId || "").trim();

    if (!id) throw new Error("id requerido");
    if (!usuarioId) throw new Error("usuarioId requerido");

    const ev = await AgendaEvent.findById(id);
    if (!ev) throw new Error("Evento no encontrado");
    if (String(ev.usuarioId) !== usuarioId) {
      throw new Error("No autorizado");
    }

    await ev.deleteOne();

    return res.json({ ok: true, deleted: true, id });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e.message });
  }
});

export default router;
