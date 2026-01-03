import express from "express";
import { computeDeadline } from "../plazos/engine/computeDeadline.js";
import DeadlineEvent from "../models/DeadlineEvent.js";

const router = express.Router();

// ----------------------------------------------------
// TZ helpers (sin librerías, Node 18+)
// ----------------------------------------------------
function ymdInTZ(tz, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normaliza minutesBefore para soportar:
 * - number: 120
 * - array: [120,60,30]
 * - objeto raro (PowerShell hashtable): @{a=120;b=60} => [120,60]
 */
function asMinutesBefore(x, fallback = 120) {
  if (x == null) return [fallback];

  if (Array.isArray(x)) {
    const arr = x.map(safeNum).filter((n) => n != null);
    return arr.length ? arr : [fallback];
  }

  if (typeof x === "object") {
    const arr = Object.values(x).map(safeNum).filter((n) => n != null);
    return arr.length ? arr : [fallback];
  }

  const n = safeNum(x);
  return n != null ? [n] : [fallback];
}

function truthy(x) {
  if (x === true) return true;
  if (x === false) return false;
  const s = String(x ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

/**
 * Decide si se debe crear agenda según múltiples formatos:
 * - agenda: true
 * - agenda: { enabled: true }
 * - agenda: { create: true }
 */
function shouldCreateAgenda(agenda) {
  if (agenda === true) return true;
  if (!agenda || typeof agenda !== "object") return false;
  return truthy(agenda.enabled) || truthy(agenda.create);
}

// ----------------------------------------------------
// POST /api/plazos/calcular
// Body:
// {
//   tz, country, domain, acto, tipo, cantidad, startISO/startUnix,
//   holidays, ajusteInhabil,
//   usuarioId,
//   agenda: true
//   ó agenda: { enabled/create, usuarioId, caseId, title, notes, minutesBefore }
// }
// ----------------------------------------------------
router.post("/calcular", async (req, res) => {
  const b = req.body || {};
  const agenda = b.agenda ?? null;

  try {
    const out = await computeDeadline({
      startISO: b.startISO,
      startUnix: b.startUnix,
      tz: b.tz || "America/Lima",

      cantidad: Number(b.cantidad ?? 0),
      tipo: b.tipo || undefined,

      country: b.country || "PE",
      domain: b.domain || "civil",
      acto: b.acto || null,

      holidays: b.holidays,
      ajusteInhabil: b.ajusteInhabil,
    });

    // --- Resultado agenda (siempre presente) ---
    let agendaResult = { created: false };

    // --- Crear/actualizar evento en Mongo (opcional) ---
    if (shouldCreateAgenda(agenda)) {
      // usuarioId puede venir en agenda.usuarioId o body.usuarioId o body.userId
      const usuarioId = String(
        (typeof agenda === "object" ? agenda.usuarioId : null) ||
          b.usuarioId ||
          b.userId ||
          ""
      ).trim();

      if (!usuarioId) {
        agendaResult = {
          created: false,
          error:
            "Agenda solicitada pero falta usuarioId (agenda.usuarioId/body.usuarioId/body.userId)",
        };
        return res.json({ ...out, agenda: agendaResult });
      }

      // sacar config del ruleset desde el trail
      const cfg = out?.trail?.find((t) => t.step === "ruleset")?.config || {};
      const tpl = cfg?.agendaTemplate || {};

      const tz = String(out?.tz || b.tz || "America/Lima").trim();
      const endISO = out?.result?.endISO;
      const endUnix = out?.result?.endUnix;

      if (!endISO || !Number.isFinite(endUnix)) {
        agendaResult = { created: false, error: "No se obtuvo endISO/endUnix del cálculo" };
        return res.json({ ...out, agenda: agendaResult });
      }

      // ✅ fecha local del vencimiento (para UX / filtros por día)
      const dueLocalDay = ymdInTZ(tz, new Date(endISO));

      // title: prioridad -> agenda.title -> template.title -> fallback
      const agendaObj = typeof agenda === "object" ? agenda : {};
      const title =
        String(agendaObj.title || b.title || tpl.title || "").trim() ||
        `Vence plazo: ${out?.input?.acto || b.acto || b.domain || "plazo"}`;

      // notes: prioridad -> agenda.notes -> body.notes -> tpl.notes -> ""
      const notes = String(agendaObj.notes || b.notes || tpl.notes || "");

      // minutesBefore: prioridad -> agenda.minutesBefore -> body.minutesBefore -> tpl.minutesBefore -> 120
      const minutesBeforeArr = asMinutesBefore(
        agendaObj.minutesBefore ?? b.minutesBefore ?? tpl.minutesBefore,
        120
      );
      const minutesBefore = minutesBeforeArr[0] ?? 120;

      // payload “plazo” automático
      const payload = {
        usuarioId,
        caseId: agendaObj.caseId ? String(agendaObj.caseId) : null,
        expedienteId: agendaObj.expedienteId ? String(agendaObj.expedienteId) : null,

        title,
        notes,

        source: "plazo",

        endISO,
        endUnix,

        dueLocalDay,
        dueLocalTime: null,

        tz,
        country: out?.input?.country || b.country || "PE",
        domain: out?.input?.domain || b.domain || "civil",
        acto: out?.input?.acto || b.acto || null,

        tipo: out?.input?.tipo || b.tipo || "habiles",
        cantidad: out?.input?.cantidad ?? Number(b.cantidad ?? 0),

        rulesetId: out?.input?.rulesetId || null,

        minutesBefore,
        status: "active",
      };

      // ✅ fingerprint estable (para que el mismo plazo no se duplique nunca)
      const fingerprint = [
        payload.usuarioId || "",
        payload.source || "plazo",
        payload.caseId || "",
        payload.expedienteId || "",
        payload.domain || "",
        payload.acto || "",
        payload.rulesetId || "",
        payload.tipo || "",
        String(payload.cantidad ?? ""),
        String(payload.endUnix ?? ""),
        payload.dueLocalDay || "",
        String(payload.title || "").trim().toLowerCase(),
      ].join("|");
      payload.fingerprint = fingerprint;

      try {
        // ✅ Si ya fue “muted” o “canceled”, NO lo revivas
        const existing = await DeadlineEvent.findOne({
          usuarioId: payload.usuarioId,
          source: "plazo",
          fingerprint,
        }).lean();

        if (existing && (existing.muted === true || existing.status === "canceled")) {
          agendaResult = {
            created: false,
            skipped: true,
            reason: existing.muted ? "muted" : "canceled",
            id: String(existing._id),
            dueLocalDay,
            minutesBefore: minutesBeforeArr,
            usedTemplate: !!cfg?.agendaTemplate,
          };
          return res.json({ ...out, agenda: agendaResult });
        }

        // ✅ UPSERT idempotente (si existe: actualiza, si no: inserta)
        const update = {
          $set: {
            title: payload.title,
            notes: payload.notes,
            endISO: payload.endISO,
            endUnix: payload.endUnix,
            dueLocalDay: payload.dueLocalDay,
            dueLocalTime: payload.dueLocalTime,
            tz: payload.tz,
            country: payload.country,
            domain: payload.domain,
            acto: payload.acto,
            tipo: payload.tipo,
            cantidad: payload.cantidad,
            rulesetId: payload.rulesetId,
            minutesBefore: payload.minutesBefore,
            status: "active",
            muted: false,
          },
          $setOnInsert: {
            usuarioId: payload.usuarioId,
            caseId: payload.caseId,
            expedienteId: payload.expedienteId,
            source: "plazo",
            fingerprint: payload.fingerprint,
            createdAt: new Date(),
          },
          $currentDate: { updatedAt: true },
        };

        const r = await DeadlineEvent.updateOne(
          { usuarioId: payload.usuarioId, source: "plazo", fingerprint: payload.fingerprint },
          update,
          { upsert: true }
        );

        const doc = await DeadlineEvent.findOne({
          usuarioId: payload.usuarioId,
          source: "plazo",
          fingerprint: payload.fingerprint,
        }).lean();

        agendaResult = {
          created: !!r.upsertedId,
          upserted: true,
          id: doc?._id ? String(doc._id) : null,
          dueLocalDay,
          minutesBefore: minutesBeforeArr,
          usedTemplate: !!cfg?.agendaTemplate,
        };
      } catch (dbErr) {
        agendaResult = {
          created: false,
          error: dbErr?.message || String(dbErr),
          name: dbErr?.name,
        };
      }
    }

    return res.json({ ...out, agenda: agendaResult });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: "Error en cálculo de plazo",
      detail: err?.message || String(err),
    });
  }
});

export default router;
