// backend/routes/jurisprudencia.js
// ============================================================
// 🦉 BúhoLex | API de Repositorio Interno de Jurisprudencia
// - GET /api/jurisprudencia            → lista con filtros
// - GET /api/jurisprudencia/:id        → detalle completo (JSON)
// - GET /api/jurisprudencia/:id/context → contexto textual para LitisBot
// ============================================================

import express from "express";
import Jurisprudencia from "../models/Jurisprudencia.js";

const router = express.Router();

/* ---------------------------- helpers de filtro --------------------------- */

function buildFilter({ q, materia, organo, estado, tipo }) {
  const filter = {};

  // Materia / especialidad (soportamos ambos campos)
  if (materia && materia !== "todas" && materia !== "") {
    filter.$or = [
      { materia },
      { especialidad: materia },
    ];
  }

  if (organo && organo !== "todos" && organo !== "") {
    filter.organo = organo;
  }

  if (estado && estado !== "todos" && estado !== "") {
    filter.estado = estado;
  }

  // tipo se maneja más en el sort, salvo "destacadas"
  if (tipo === "destacadas") {
    filter.$or = [
      ...(filter.$or || []),
      { destacado: true },
      { destacada: true },
    ];
  }

  // Búsqueda por texto completo (índice text)
  if (q && q.trim()) {
    const text = q.trim();
    filter.$text = { $search: text };
  }

  return filter;
}

/* ------------------------- helper: contexto para IA ----------------------- */

function htmlToPlain(html = "") {
  if (!html) return "";
  // conversión simple: quitamos tags y compactamos espacios
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildContextFromDoc(doc) {
  const parts = [];

  if (doc.titulo) {
    parts.push(`TÍTULO: ${doc.titulo}`);
  }

  if (doc.tipoResolucion || doc.recurso) {
    const t = [
      doc.tipoResolucion && `Tipo de resolución: ${doc.tipoResolucion}`,
      doc.recurso && `Recurso: ${doc.recurso}`,
    ]
      .filter(Boolean)
      .join(" · ");
    if (t) parts.push(t);
  }

  if (doc.numeroExpediente) {
    parts.push(`EXPEDIENTE: ${doc.numeroExpediente}`);
  }

  if (doc.organo || doc.salaSuprema) {
    parts.push(
      `ÓRGANO: ${doc.organo || doc.salaSuprema}`
    );
  }

  if (doc.especialidad || doc.materia) {
    parts.push(
      `ESPECIALIDAD: ${doc.especialidad || doc.materia}`
    );
  }

  if (doc.fechaResolucion) {
    const f = new Date(doc.fechaResolucion).toLocaleDateString("es-PE");
    parts.push(`FECHA DE RESOLUCIÓN: ${f}`);
  }

  if (doc.pretensionDelito) {
    parts.push(`PRETENSIÓN / DELITO: ${doc.pretensionDelito}`);
  }

  if (doc.normaDerechoInterno) {
    parts.push(`NORMA DE DERECHO INTERNO: ${doc.normaDerechoInterno}`);
  }

  if (doc.palabrasClave && doc.palabrasClave.length) {
    parts.push(`PALABRAS CLAVE: ${doc.palabrasClave.join(", ")}`);
  }

  if (doc.sumilla) {
    parts.push(`SUMILLA:\n${doc.sumilla}`);
  }

  if (doc.resumen) {
    parts.push(`RESUMEN:\n${doc.resumen}`);
  }

  // Contenido completo / ficha
  if (doc.contenidoHTML) {
    const plain = htmlToPlain(doc.contenidoHTML);
    if (plain) {
      parts.push(`CONTENIDO DE LA FICHA:\n${plain}`);
    }
  } else if (doc.texto) {
    parts.push(`TEXTO COMPLETO:\n${doc.texto}`);
  }

  if (doc.fundamentos) {
    parts.push(`FUNDAMENTOS PRINCIPALES:\n${doc.fundamentos}`);
  }

  if (doc.baseLegal) {
    parts.push(`BASE LEGAL:\n${doc.baseLegal}`);
  }

  if (doc.parteResolutiva) {
    parts.push(`PARTE RESOLUTIVA:\n${doc.parteResolutiva}`);
  }

  return parts.join("\n\n").trim();
}

/* ------------------------ GET /api/jurisprudencia ------------------------- */

router.get("/", async (req, res) => {
  try {
    const {
      q = "",
      materia = "todas",
      organo = "todos",
      estado = "todos",
      tipo: tipoQuery = "todas",
      tag: tagQuery = "",
      limit = "50",
    } = req.query;

    // Permitimos tag o tipo; prioridad a tipo si viene explícito
    const tipo =
      (tipoQuery && String(tipoQuery)) ||
      (tagQuery && String(tagQuery)) ||
      "todas";

    const filter = buildFilter({ q, materia, organo, estado, tipo });

    // Orden según tipo
    let sort = { createdAt: -1 };

    if (tipo === "recientes") {
      sort = { fechaResolucion: -1, createdAt: -1 };
    } else if (tipo === "citadas" || tipo === "mas_citadas") {
      sort = { citadaCount: -1, createdAt: -1 };
    } else if (tipo === "destacadas") {
      sort = { fechaResolucion: -1, createdAt: -1 };
    }

    const lim = Math.min(parseInt(limit, 10) || 50, 100);

    // Proyección ligera para listado (no mandamos contenidoHTML pesado)
    const projection = {
      titulo: 1,
      numeroExpediente: 1,
      tipoResolucion: 1,
      salaSuprema: 1,
      organo: 1,
      especialidad: 1,
      materia: 1,
      estado: 1,
      fechaResolucion: 1,
      sumilla: 1,
      resumen: 1,
      pretensionDelito: 1,
      palabrasClave: 1,
      fuente: 1,
      fuenteUrl: 1,
      urlResolucion: 1,
      createdAt: 1,
      destacada: 1,
      destacado: 1,
      citadaCount: 1,
    };

    const items = await Jurisprudencia.find(filter, projection)
      .sort(sort)
      .limit(lim)
      .lean();

    return res.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[API] /api/jurisprudencia error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al consultar jurisprudencia interna.",
    });
  }
});

/* --------------------- GET /api/jurisprudencia/:id ------------------------ */

router.get("/:id", async (req, res) => {
  try {
    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    return res.json({ ok: true, item: doc });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al obtener la resolución.",
    });
  }
});

/* --------------- GET /api/jurisprudencia/:id/context (LitisBot) ----------- */

router.get("/:id/context", async (req, res) => {
  try {
    const { maxChars } = req.query;

    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    let text = buildContextFromDoc(doc);

    // Recorte opcional para no saturar el prompt de LitisBot
    let clipped = text;
    if (maxChars) {
      const n = parseInt(maxChars, 10);
      if (!Number.isNaN(n) && n > 0) {
        clipped = text.slice(0, n);
      }
    }

    return res.json({
      ok: true,
      id: String(doc._id),
      text: clipped,
      meta: {
        titulo: doc.titulo,
        numeroExpediente: doc.numeroExpediente,
        tipoResolucion: doc.tipoResolucion,
        recurso: doc.recurso,
        salaSuprema: doc.salaSuprema,
        organo: doc.organo,
        especialidad: doc.especialidad || doc.materia,
        fechaResolucion: doc.fechaResolucion,
        fuente: doc.fuente,
        fuenteUrl: doc.fuenteUrl || doc.urlResolucion,
      },
    });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id/context error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al construir el contexto de la resolución.",
    });
  }
});

export default router;
