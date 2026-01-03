// ============================================================
// 🗓️ BÚHOLEX – AGENDA ROUTES (Enterprise v3.6)
// ------------------------------------------------------------
// ✅ FIX REAL:
// - Esta ruta es para PLAZOS AUTOMÁTICOS (DeadlineEvent), no manuales.
// - Endpoints: hoy / rango / status / delete
// - Legacy compatible (endUnix) con prioridad dueLocalDay
// - Validación estricta, respuestas deterministas
// - Cache-Control no-store
// ============================================================

import express from "express";
import DeadlineEvent from "../models/DeadlineEvent.js";

const router = express.Router();

const FALLBACK_TZ = "UTC";

/* ============================================================
 * Utils
============================================================ */
const normTZ = (tz) => String(tz || FALLBACK_TZ).trim() || FALLBACK_TZ;

function ymdInTZ(tz = DEFAULT_TZ, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localDayFromUnix(unix, tz = DEFAULT_TZ) {
  const n = Number(unix);
  if (!Number.isFinite(n)) return null;

  const d = new Date(n * 1000);
  if (Number.isNaN(d.getTime())) return null;

  return ymdInTZ(tz, d);
}

function assertYMD(v, name = "fecha") {
  const s = String(v || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`${name} inválida, usa YYYY-MM-DD`);
  }
  return s;
}

function normalizeStatus(s) {
  const v = String(s || "").trim().toLowerCase();
  if (!["active", "done", "canceled"].includes(v)) {
    throw new Error("status inválido (active|done|canceled)");
  }
  return v;
}

/* ============================================================
 * GET /api/agenda/hoy
 * ------------------------------------------------------------
 * Devuelve PLAZOS que vencen en el día local del usuario (active).
============================================================ */
router.get("/hoy", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) throw new Error("usuarioId es requerido");

    const tz = normTZ(req.query.tz);
    const today = ymdInTZ(tz);

    // Moderno (con dueLocalDay)
    let items = await DeadlineEvent.find({
      usuarioId,
      status: "active",
      dueLocalDay: today,
    })
      .sort({ endUnix: 1 })
      .lean();

    // Legacy fallback (sin dueLocalDay)
    if (!items.length) {
      const legacy = await DeadlineEvent.find({
        usuarioId,
        status: "active",
        $or: [
          { dueLocalDay: { $exists: false } },
          { dueLocalDay: null },
          { dueLocalDay: "" },
        ],
      })
        .sort({ endUnix: 1 })
        .lean();

      items = legacy.filter((ev) => localDayFromUnix(ev.endUnix, tz) === today);
    }

    return res.set("Cache-Control", "no-store").json({
      ok: true,
      tz,
      day: today,
      count: items.length,
      items,
    });
  } catch (err) {
    return res.status(400).json({ ok: false, detail: err?.message || String(err) });
  }
});

/* ============================================================
 * GET /api/agenda/rango
 * ------------------------------------------------------------
 * Devuelve PLAZOS activos entre dos fechas YYYY-MM-DD.
============================================================ */
router.get("/rango", async (req, res) => {
  try {
    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) throw new Error("usuarioId es requerido");

    const tz = normTZ(req.query.tz);
    const from = assertYMD(req.query.from, "from");
    const to = assertYMD(req.query.to, "to");

    // Modernos
    let items = await DeadlineEvent.find({
      usuarioId,
      status: "active",
      dueLocalDay: { $gte: from, $lte: to },
    })
      .sort({ dueLocalDay: 1, endUnix: 1 })
      .lean();

    // Legacy (sin dueLocalDay)
    const legacy = await DeadlineEvent.find({
      usuarioId,
      status: "active",
      $or: [
        { dueLocalDay: { $exists: false } },
        { dueLocalDay: null },
        { dueLocalDay: "" },
      ],
    })
      .sort({ endUnix: 1 })
      .lean();

    if (legacy.length) {
      const legacyInRange = legacy.filter((ev) => {
        const d = localDayFromUnix(ev.endUnix, tz);
        return d && d >= from && d <= to;
      });

      // fusionar sin duplicar (por _id)
      const seen = new Set(items.map((x) => String(x._id)));
      for (const ev of legacyInRange) {
        const id = String(ev._id);
        if (!seen.has(id)) items.push(ev);
      }

      items.sort((a, b) => (a.endUnix ?? 0) - (b.endUnix ?? 0));
    }

    return res.set("Cache-Control", "no-store").json({
      ok: true,
      tz,
      from,
      to,
      count: items.length,
      items,
    });
  } catch (err) {
    return res.status(400).json({ ok: false, detail: err?.message || String(err) });
  }
});

/* ============================================================
 * PUT /api/agenda/:id/status
 * ------------------------------------------------------------
 * Actualiza el estado del PLAZO.
 * ✅ Seguro: exige usuarioId (no tocar plazos ajenos).
============================================================ */
router.put("/:id/status", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) throw new Error("id es requerido");

    const usuarioId = String(req.body?.usuarioId || "").trim();
    if (!usuarioId) throw new Error("usuarioId es requerido");

    const status = normalizeStatus(req.body?.status);

    const updated = await DeadlineEvent.findOneAndUpdate(
      { _id: id, usuarioId },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) throw new Error("Plazo no encontrado");

    return res.set("Cache-Control", "no-store").json({
      ok: true,
      item: updated,
    });
  } catch (err) {
    return res.status(400).json({ ok: false, detail: err?.message || String(err) });
  }
});

/* ============================================================
 * DELETE /api/agenda/:id?usuarioId=...
 * ------------------------------------------------------------
 * Elimina el PLAZO (si tú decides permitirlo).
 * Recomendación enterprise: usar status=canceled, pero aquí está.
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) throw new Error("id es requerido");

    const usuarioId = String(req.query.usuarioId || "").trim();
    if (!usuarioId) throw new Error("usuarioId es requerido");

    const out = await DeadlineEvent.deleteOne({ _id: id, usuarioId });

    return res.set("Cache-Control", "no-store").json({
      ok: true,
      deleted: out.deletedCount === 1,
    });
  } catch (err) {
    return res.status(400).json({ ok: false, detail: err?.message || String(err) });
  }
});

export default router;
