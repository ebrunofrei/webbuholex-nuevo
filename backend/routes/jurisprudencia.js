// backend/routes/jurisprudencia.js
// ============================================================
// 🦉 BúhoLex | API de Repositorio Interno de Jurisprudencia
// ------------------------------------------------------------
// - GET  /api/jurisprudencia             → lista con filtros + búsqueda
// - GET  /api/jurisprudencia/:id         → detalle completo (JSON + meta)
// - GET  /api/jurisprudencia/:id/context → contexto textual para LitisBot
// - GET  /api/jurisprudencia/:id/pdf     → proxy de PDF oficial (visor + descarga)
// ============================================================

import express from "express";
import fetch from "node-fetch";
import { dbConnect } from "../services/db.js";
import Jurisprudencia from "../models/Jurisprudencia.js";
import { buildJurisprudenciaContext } from "../services/jurisprudenciaContext.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               helpers generales                             */
/* -------------------------------------------------------------------------- */

function safeInt(value, def = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? def : n;
}

/**
 * Regex seguro para Mongo: evita errores tipo 51091 (quantifier...).
 * - corta inputs basura
 * - escapa caracteres
 * - try/catch por si el motor rechaza el patrón
 */
function buildSafeRegex(input) {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length < 2) return null; // evita "+" "*" "(" etc.

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  try {
    return new RegExp(escaped, "i");
  } catch {
    return null;
  }
}

/**
 * URL segura de PDF (misma lógica en toda la API).
 */
function getSafePdfUrl(doc = {}) {
  return (
    (doc.pdfOficialUrl && String(doc.pdfOficialUrl).trim()) ||
    (doc.pdfUrl && String(doc.pdfUrl).trim()) ||
    (doc.urlResolucion && String(doc.urlResolucion).trim()) ||
    null
  );
}

/**
 * Construye el filtro base a partir de query params.
 * Pensado para datos JNS pero compatible con otras fuentes.
 */
function buildFilter({ q, materia, organo, estado, tipo, origen, tag, anio }) {
  const filter = {};

  // Origen / fuente (ej. JNS, TC, etc.)
  if (origen && origen !== "todos" && origen !== "todas") {
    filter.origen = origen;
  }

  // Materia / especialidad
  if (materia && materia !== "todas" && materia !== "") {
    const orArr = filter.$or ? [...filter.$or] : [];
    orArr.push({ materia }, { especialidad: materia });
    filter.$or = orArr;
  }

  // Órgano / sala
  if (organo && organo !== "todos" && organo !== "") {
    filter.organo = organo;
  }

  // Estado del registro
  if (estado && estado !== "todos" && estado !== "") {
    filter.estado = estado;
  }

  // Tags específicos
  if (tag && tag !== "") {
    filter.tags = { $in: [tag] };
  }

  // Tipo especial de listado
  if (tipo === "destacadas") {
    const orArr = filter.$or ? [...filter.$or] : [];
    orArr.push({ destacado: true }, { destacada: true });
    filter.$or = orArr;
  }

  // 🔹 Filtro por año de la resolución
  if (anio) {
    const yearInt = safeInt(anio, 0);
    if (yearInt > 0) {
      const from = new Date(yearInt, 0, 1);   // 1 enero año
      const to = new Date(yearInt + 1, 0, 1); // 1 enero año siguiente
      filter.fechaResolucion = { $gte: from, $lt: to };
    }
  }

  // 🔍 Búsqueda textual SIN $text (evitamos índice especial)
if (q && q.trim()) {
  const regex = buildSafeRegex(q);

  // Si el patrón es inválido o demasiado corto, no aplicamos búsqueda
  if (regex) {
    const orArr = filter.$or ? [...filter.$or] : [];

    orArr.push(
      { titulo: regex },
      { numeroExpediente: regex },
      { sumilla: regex },
      { resumen: regex },
      { palabrasClave: regex }
    );

    filter.$or = orArr;
  }
}

  return filter;
}

/**
 * Ordenamiento para listados sin búsqueda textual.
 */
function buildSort(tipo) {
  let sort = { createdAt: -1 };

  if (tipo === "recientes") {
    sort = { fechaResolucion: -1, createdAt: -1 };
  } else if (tipo === "citadas" || tipo === "mas_citadas") {
    sort = { citadaCount: -1, createdAt: -1 };
  } else if (tipo === "destacadas") {
    sort = { fechaResolucion: -1, createdAt: -1 };
  }

  return sort;
}

/* ----------------------- helper: meta compacto (Fase B) ------------------- */

function buildMetaFromDoc(doc) {
  const safePdfUrl = getSafePdfUrl(doc);

  return {
    titulo: doc.titulo || "",
    numeroExpediente: doc.numeroExpediente || "",
    tipoResolucion: doc.tipoResolucion || "",
    recurso: doc.recurso || "",
    salaSuprema: doc.salaSuprema || "",
    organo: doc.organo || "",
    especialidad: doc.especialidad || doc.materia || "",
    materia: doc.materia || "",
    tema: doc.tema || "",
    subtema: doc.subtema || "",
    fechaResolucion: doc.fechaResolucion || null,
    fuente: doc.fuente || "Poder Judicial",
    origen: doc.origen || doc.fuente || "JNS",
    fuenteUrl: doc.fuenteUrl || safePdfUrl || "",
    pdfUrl: safePdfUrl,
  };
}

/* ---------------- helper: normalizar item para el frontend ---------------- */

function normalizeItemForFrontend(doc) {
  const safeId = String(doc._id || "");
  const safePdfUrl = getSafePdfUrl(doc);

  return {
    ...doc,
    id: safeId, // el frontend trabaja con id en lugar de _id
    pdfUrl: safePdfUrl,
    origen: doc.origen || doc.fuente || "JNS",
    hasContenido: !!(doc.contenidoHTML || doc.texto || doc.textoIA),
  };
}

/* ------------------------ GET /api/jurisprudencia ------------------------- */
/**
 * Listado con filtros + búsqueda.
 * Soporta:
 *  - q: texto libre
 *  - materia: "Penal", "Civil", etc.
 *  - organo: nombre del órgano / sala
 *  - estado: "Vigente", "Anulado", etc.
 *  - tipo: "recientes" | "destacadas" | "citadas" | ...
 *  - tag: etiqueta específica (penal, jns, interno, etc.)
 *  - origen: "JNS", "TC", etc.
 *  - page, limit: paginación
 */
router.get("/", async (req, res) => {
  try {
    await dbConnect();

    const {
      q = "",
      materia = "todas",
      organo = "todos",
      estado = "todos",
      tipo: tipoQuery = "todas",
      tag: tagQuery = "",
      origen = "JNS",
      anio = "",
      limit = "50",
      page = "1",
    } = req.query;

    const tipo =
      (tipoQuery && String(tipoQuery)) ||
      (tagQuery && String(tagQuery)) ||
      "todas";

    const hayTexto = q && q.trim().length > 0;
    const tag =
      tagQuery && String(tagQuery).trim() ? String(tagQuery).trim() : "";

    const filter = buildFilter({
      q: hayTexto ? q : "",
      materia,
      organo,
      estado,
      tipo,
      origen,
      tag,
      anio,
    });

    const lim = Math.min(safeInt(limit, 50) || 50, 100);
    const pageNum = Math.max(safeInt(page, 1), 1);
    const skip = (pageNum - 1) * lim;

    // Proyección base para listado (evitar payload pesado)
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
      origen: 1,
      fuenteUrl: 1,
      urlResolucion: 1,
      pdfUrl: 1,
      pdfOficialUrl: 1,
      createdAt: 1,
      destacada: 1,
      destacado: 1,
      citadaCount: 1,
      tags: 1,
    };

    let query;

    if (hayTexto) {
      // 🔎 Ahora solo ordenamos por relevancia “manual”
      const sort = { fechaResolucion: -1, citadaCount: -1, createdAt: -1 };
      query = Jurisprudencia.find(filter, projection).sort(sort);
    } else {
      // Ordenamiento normal por tipo
      const sort = buildSort(tipo);
      query = Jurisprudencia.find(filter, projection).sort(sort);
    }

    const total = await Jurisprudencia.countDocuments(filter);
    const rawItems = await query.skip(skip).limit(lim).lean();
    const items = rawItems.map((doc) => normalizeItemForFrontend(doc));

    return res.json({
      ok: true,
      count: items.length,
      total,
      page: pageNum,
      limit: lim,
      items,
    });
  } catch (err) {
    console.error("[API] GET /api/jurisprudencia error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al consultar jurisprudencia interna.",
      debug: err?.message || String(err),
    });
  }
});

/* ------------------ GET /api/jurisprudencia/:id/pdf ----------------------- */
/* Proxy de PDF oficial para visor + descarga */

router.get("/:id/pdf", async (req, res) => {
  try {
    await dbConnect();

    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc) {
      return res
        .status(404)
        .json({ ok: false, error: "not_found", msg: "Resolución no encontrada." });
    }

    const pdfUrl = getSafePdfUrl(doc) || "";

    if (!pdfUrl) {
      return res
        .status(404)
        .json({ ok: false, error: "pdf_not_found", msg: "PDF no disponible." });
    }

    const download = String(req.query.download || "").toLowerCase() === "1";

    const wantsJson =
      String(req.query.format || "").toLowerCase() === "json" ||
      (req.headers.accept || "").includes("application/json");

    let upstream;
    try {
      upstream = await fetch(pdfUrl);
    } catch (e) {
      console.error(
        "[API] /api/jurisprudencia/:id/pdf fetch error:",
        e?.message || e
      );
    }

    if (!upstream || !upstream.ok || !upstream.body) {
      console.error(
        "[API] /api/jurisprudencia/:id/pdf upstream error:",
        upstream && upstream.status,
        pdfUrl
      );

      if (wantsJson) {
        return res.status(502).json({
          ok: false,
          error: "upstream_error",
          msg: "No se pudo obtener el PDF desde la fuente original.",
        });
      }

      res.status(200).type("html").send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>PDF no disponible</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
                   sans-serif;
      background: #fdf7f2;
      color: #4b5563;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .box {
      max-width: 540px;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #f5d0a4;
      background: #fff7ed;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
      font-size: 14px;
      line-height: 1.5;
    }
    .title {
      font-weight: 600;
      margin-bottom: 6px;
      color: #92400e;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid #fbbf24;
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
    }
    .btn:hover {
      background: #fde68a;
    }
  </style>
</head>
<body>
  <div class="box">
    <div class="title">No se pudo cargar el visor integrado</div>
    <p>
      Hubo un problema al obtener el PDF desde el Poder Judicial.
      Puedes intentar abrir directamente la resolución oficial en una nueva pestaña.
    </p>
    <a class="btn" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">
      Abrir PDF oficial del Poder Judicial
    </a>
  </div>
</body>
</html>`);
      return;
    }

    // Nombre de archivo razonable
    let filename = "resolucion.pdf";
    try {
      const urlObj = new URL(pdfUrl);
      const last = urlObj.pathname.split("/").filter(Boolean).pop();
      if (last && last.toLowerCase().endsWith(".pdf")) {
        filename = last;
      } else if (doc.numeroExpediente) {
        filename = `resolucion_${doc.numeroExpediente}.pdf`;
      }
    } catch {
      /* ignore */
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${filename}"`
    );

    upstream.body.pipe(res);
    upstream.body.on("error", (err) => {
      console.error("[API] /api/jurisprudencia/:id/pdf stream error:", err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id/pdf error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al obtener el PDF de la resolución.",
    });
  }
});

/* ----------------- GET /api/jurisprudencia/:id/context -------------------- */
/* Contexto textual compacto para LitisBot */

router.get("/:id/context", async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.params;

    // lean(false) para obtener documento Mongoose con métodos/virtuals
    const doc = await Jurisprudencia.findById(id).lean(false);
    if (!doc) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
        msg: "Resolución no encontrada",
      });
    }

    const payload = buildJurisprudenciaContext(doc);

    if (!payload) {
      return res.status(500).json({
        ok: false,
        error: "context_error",
        msg: "No se pudo construir el contexto",
      });
    }

    return res.status(200).json({
      ok: true,
      id: String(doc._id),
      context: payload.contextText,
      meta: payload.meta,
    });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id/context error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error interno al obtener el contexto de jurisprudencia",
    });
  }
});

/* --------------------- GET /api/jurisprudencia/:id ------------------------ */

router.get("/:id", async (req, res) => {
  try {
    await dbConnect();
    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    const item = normalizeItemForFrontend(doc);
    const meta = buildMetaFromDoc(doc);

    return res.json({ ok: true, item, meta });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al obtener la resolución.",
    });
  }
});

export default router;
