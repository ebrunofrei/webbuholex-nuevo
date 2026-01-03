import express from "express";
import crypto from "crypto";
import AgendaEvent from "../models/AgendaEvent.js";
import { enviarWhatsApp } from "#services/whatsappService.js";
import { logWhatsApp } from "#services/whatsappLoggerFirebase.js";

const router = express.Router();

const DEFAULT_TZ = "America/Lima";

/* ============================================================
 * Utils
============================================================ */
function assertISODate(s, name) {
  const d = new Date(String(s));
  if (Number.isNaN(d.getTime())) throw new Error(`${name} inválido (ISO requerido)`);
  return d;
}

function assertYMD(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) {
    throw new Error("Fecha inválida (YYYY-MM-DD)");
  }
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

function makeHash(s = "") {
  return crypto.createHash("sha1").update(String(s)).digest("hex");
}

// E.164 suave (multi-país): no bloquea guardado, solo evita enviar si es inválido.
function looksE164(phone) {
  return /^\+\d{8,15}$/.test(String(phone || "").trim());
}

function hasTwilioCreds() {
  return !!(
    process.env.TWILIO_SID &&
    process.env.TWILIO_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  );
}

/* ============================================================
 * WhatsApp helpers
============================================================ */
function buildWhatsAppMessage({ event, mode = "created" }) {
  const titulo = String(event?.title || "evento").trim();
  const day = event?.dueLocalDay ? ` (${event.dueLocalDay})` : "";

  if (mode === "red") {
    return `🟥 Colega, te queda MENOS de 2 horas para: ${titulo}${day}. 🦉 BúhoLex`;
  }
  if (mode === "updated") {
    return `🦉 Evento actualizado: ${titulo}${day}.`;
  }
  return `🦉 Evento registrado: ${titulo}${day}.`;
}

/**
 * Intenta enviar WA SIN tumbar flujo principal.
 * Anti-loop: waLastHash (persistente)
 * Hash robusto: incluye _id + endUnix
 */
async function trySendWhatsAppForEvent({ event, to, mode }) {
  if (!event?.alertaWhatsapp) return { attempted: false, sent: false, reason: "alertaWhatsapp=false" };

  const phone = String(to || "").trim();
  if (!phone) return { attempted: true, sent: false, reason: "no_to" };

  // Enterprise multi-país: solo enviamos si es E.164 (con +)
  if (!looksE164(phone)) {
    return { attempted: true, sent: false, reason: "phone_not_e164" };
  }

  // Si no hay creds, no intentamos enviar (pero NO fallamos)
  if (!hasTwilioCreds()) {
    return { attempted: true, sent: false, reason: "twilio_creds_missing" };
  }

  const body = buildWhatsAppMessage({ event, mode });

  const eid = event?._id ? String(event._id) : "noid";
  const endUnix = Number(event?.endUnix || 0);

  const h = makeHash(`${eid}|${phone}|${mode}|${endUnix}|${body}`);

  // anti-loop
  if (event.waLastHash && event.waLastHash === h) {
    return { attempted: true, sent: false, reason: "same_hash" };
  }

  // envío + log (si Twilio falla, lo capturamos arriba)
  await enviarWhatsApp(phone, body);
  await logWhatsApp({
    usuarioId: event.usuarioId,
    to: phone,
    mensaje: body,
    meta: { mode, endUnix, eventId: eid },
  });

  event.waLastHash = h;
  return { attempted: true, sent: true };
}

/* ============================================================
 * GET /api/agenda-eventos/rango
 * ?usuarioId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD&tz=America/Lima
============================================================ */
router.get("/rango", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const tz = String(req.query.tz || DEFAULT_TZ).trim();

    if (!usuarioId) throw new Error("usuarioId es requerido");
    if (!from || !to) throw new Error("from y to son requeridos");
    assertYMD(from);
    assertYMD(to);

    // Moderno: por dueLocalDay
    let items = await AgendaEvent.find({
      usuarioId,
      status: "active",
      dueLocalDay: { $gte: from, $lte: to },
    })
      .sort({ dueLocalDay: 1, startUnix: 1 })
      .lean();

    // fallback legacy sin dueLocalDay
    if (!items.length) {
      const fromUnix = unixFromISO(`${from}T00:00:00.000Z`);
      const toUnix = unixFromISO(`${to}T23:59:59.000Z`);

      const legacy = await AgendaEvent.find({
        usuarioId,
        status: "active",
        $or: [
          { dueLocalDay: { $exists: false } },
          { dueLocalDay: null },
          { dueLocalDay: "" },
        ],
        startUnix: { $lte: toUnix },
        endUnix: { $gte: fromUnix },
      })
        .sort({ startUnix: 1 })
        .lean();

      items = legacy;
    }

    return res.json({ ok: true, tz, count: items.length, items });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e?.message || String(e) });
  }
});

/* ============================================================
 * GET /api/agenda-eventos/alertas-criticas?usuarioId=xxx&tz=America/Lima
 * B) Eventos en ROJO (≤2h) sin CRON
 * Anti-dup: waRedNotifiedAt + waLastHash
============================================================ */
router.get("/alertas-criticas", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    const tz = String(req.query.tz || DEFAULT_TZ).trim();

    if (!usuarioId) throw new Error("usuarioId es requerido");

    const nowUnix = Math.floor(Date.now() / 1000);
    const twoHoursUnix = nowUnix + 2 * 60 * 60;

    const soon = await AgendaEvent.find({
      usuarioId,
      status: "active",
      alertaWhatsapp: true,
      telefono: { $ne: "" },
      endUnix: { $gte: nowUnix, $lte: twoHoursUnix },
      $or: [
        { waRedNotifiedAt: null },
        { waRedNotifiedAt: { $exists: false } },
      ],
    })
      .sort({ endUnix: 1 })
      .limit(50);

    let sent = 0;
    let attempted = 0;
    const warnings = [];

    for (const ev of soon) {
      const to = String(ev.telefono || "").trim();
      if (!to) continue;

      attempted++;
      try {
        const r = await trySendWhatsAppForEvent({ event: ev, to, mode: "red" });
        if (r.sent) {
          ev.waRedNotifiedAt = new Date();
          await ev.save();
          sent++;
        } else if (r.reason) {
          warnings.push({ id: String(ev._id), reason: r.reason });
        }
      } catch (err) {
        warnings.push({ id: String(ev._id), reason: err?.message || "wa_failed" });
        // no rompe el endpoint
      }
    }

    return res.json({
      ok: true,
      tz,
      checked: soon.length,
      attempted,
      sent,
      warnings: warnings.slice(0, 20), // no saturar respuesta
    });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e?.message || String(e) });
  }
});

/* ============================================================
 * POST /api/agenda-eventos
 * Body: { usuarioId, tz, title, startISO, endISO, notes/description, telefono, alertaWhatsapp }
 * A) WhatsApp inmediato si alertaWhatsapp=true (NO bloquea guardado)
============================================================ */
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};

    const usuarioId = String(b.usuarioId || "").trim();
    const tz = String(b.tz || DEFAULT_TZ).trim();
    const title = String(b.title || "").trim();

    if (!usuarioId) throw new Error("usuarioId es requerido");
    if (!title) throw new Error("title es requerido");

    const start = assertISODate(b.startISO, "startISO");
    const end = assertISODate(b.endISO, "endISO");

    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(end.getTime() / 1000);
    if (endUnix < startUnix) throw new Error("endISO no puede ser menor que startISO");

    const dueLocalDay = ymdInTZ(tz, start);

    const notes = String(b.notes ?? b.description ?? "");

    const doc = await AgendaEvent.create({
      usuarioId,
      caseId: b.caseId ? String(b.caseId) : null,
      expedienteId: b.expedienteId ? String(b.expedienteId) : null,

      title,
      notes,
      description: notes, // espejo legacy

      startISO: start.toISOString(),
      startUnix,
      endISO: end.toISOString(),
      endUnix,

      dueLocalDay,
      tz,

      telefono: String(b.telefono || "").trim(),
      alertaWhatsapp: !!b.alertaWhatsapp,

      // anti-dup WA
      waSentAt: null,
      waRedNotifiedAt: null,
      waLastHash: "",

      status: "active",
    });

    // A) WA inmediato (NO bloqueante)
    const whatsapp = { attempted: false, sent: false, warning: null };
    if (doc.alertaWhatsapp && doc.telefono && !doc.waSentAt) {
      whatsapp.attempted = true;
      try {
        const r = await trySendWhatsAppForEvent({ event: doc, to: doc.telefono, mode: "created" });
        if (r.sent) {
          doc.waSentAt = new Date();
          await doc.save();
          whatsapp.sent = true;
        } else {
          whatsapp.warning = r.reason || "not_sent";
        }
      } catch (err) {
        whatsapp.warning = err?.message || "wa_failed";
      }
    }

    return res.json({ ok: true, item: doc, whatsapp });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e?.message || String(e) });
  }
});

/* ============================================================
 * PUT /api/agenda-eventos/:id/status
============================================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const status = String(req.body?.status || "").trim();

    if (!id) throw new Error("id requerido");
    if (!["active", "done", "canceled"].includes(status)) {
      throw new Error("status inválido (active|done|canceled)");
    }

    const doc = await AgendaEvent.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!doc) throw new Error("Evento no encontrado");

    return res.json({ ok: true, item: doc });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e?.message || String(e) });
  }
});

/* ============================================================
 * PUT /api/agenda-eventos/:id
 * Edita evento + recalcula dueLocalDay
 * A) WA conservador si se activó y nunca se envió (waSentAt null)
 * Reset inteligente de rojo si cambió horario
============================================================ */
router.put("/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) throw new Error("id requerido");

    const b = req.body || {};
    const usuarioId = String(b.usuarioId || "").trim();
    const tz = String(b.tz || DEFAULT_TZ).trim();

    if (!usuarioId) throw new Error("usuarioId es requerido");

    const current = await AgendaEvent.findById(id);
    if (!current) throw new Error("Evento no encontrado");
    if (String(current.usuarioId) !== usuarioId) throw new Error("No autorizado");

    const title =
      b.title != null ? String(b.title).trim() : String(current.title || "").trim();
    if (!title) throw new Error("title es requerido");

    const start = b.startISO
      ? assertISODate(b.startISO, "startISO")
      : new Date(String(current.startISO));
    const end = b.endISO
      ? assertISODate(b.endISO, "endISO")
      : new Date(String(current.endISO));

    const nextStartISO = start.toISOString();
    const nextEndISO = end.toISOString();

    const changedTime =
      String(current.startISO) !== nextStartISO || String(current.endISO) !== nextEndISO;

    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(end.getTime() / 1000);
    if (endUnix < startUnix) throw new Error("endISO no puede ser menor que startISO");

    const dueLocalDay = ymdInTZ(tz, start);

    const notesIncoming = b.notes ?? b.description ?? current.notes ?? current.description ?? "";
    const notes = String(notesIncoming || "");

    const telefono =
      b.telefono != null ? String(b.telefono || "").trim() : String(current.telefono || "").trim();
    const alertaWhatsapp =
      b.alertaWhatsapp != null ? !!b.alertaWhatsapp : !!current.alertaWhatsapp;

    const status =
      b.status && ["active", "done", "canceled"].includes(String(b.status))
        ? String(b.status)
        : String(current.status || "active");

    current.title = title;
    current.notes = notes;
    current.description = notes; // espejo legacy
    current.startISO = nextStartISO;
    current.startUnix = startUnix;
    current.endISO = nextEndISO;
    current.endUnix = endUnix;
    current.dueLocalDay = dueLocalDay;
    current.tz = tz;
    current.telefono = telefono;
    current.alertaWhatsapp = alertaWhatsapp;
    current.status = status;

    // Si cambió el horario, permitimos “rojo” otra vez en su nueva ventana
    if (changedTime) {
      current.waRedNotifiedAt = null;
      current.waLastHash = "";
    }

    await current.save();

    // A) WA conservador post-edición: solo si se activó y nunca se envió
    const whatsapp = { attempted: false, sent: false, warning: null };
    if (current.alertaWhatsapp && current.telefono && !current.waSentAt) {
      whatsapp.attempted = true;
      try {
        const r = await trySendWhatsAppForEvent({
          event: current,
          to: current.telefono,
          mode: "updated",
        });
        if (r.sent) {
          current.waSentAt = new Date();
          await current.save();
          whatsapp.sent = true;
        } else {
          whatsapp.warning = r.reason || "not_sent";
        }
      } catch (err) {
        whatsapp.warning = err?.message || "wa_failed";
      }
    }

    return res.json({ ok: true, item: current.toObject(), whatsapp });
  } catch (e) {
    return res.status(400).json({ ok: false, detail: e?.message || String(e) });
  }
});
/* ============================================================
 * DELETE /api/agenda-eventos/:id
 * Hard delete (elimina definitivamente)
============================================================ */
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

    return res.json({
      ok: true,
      deleted: true,
      id,
    });
  } catch (e) {
    return res.status(400).json({
      ok: false,
      detail: e?.message || String(e),
    });
  }
});

export default router;
