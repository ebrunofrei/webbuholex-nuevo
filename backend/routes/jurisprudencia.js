// backend/routes/jurisprudencia.js
// ============================================================
// 🦉 BúhoLex | API de Repositorio Interno de Jurisprudencia
// ------------------------------------------------------------
// - GET  /api/jurisprudencia             → lista con filtros + búsqueda full-text
// - GET  /api/jurisprudencia/:id         → detalle completo (JSON + meta)
// - GET  /api/jurisprudencia/:id/context → contexto textual para LitisBot (Fase B)
// - GET  /api/jurisprudencia/:id/pdf     → proxy de PDF (visor + descarga)
// ============================================================

import express from "express";
import fetch from "node-fetch";
import Jurisprudencia from "../models/Jurisprudencia.js";

const router = express.Router();

/* ---------------------------- helpers de filtro --------------------------- */

function buildFilter({ q, materia, organo, estado, tipo }) {
  const filter = {};

  // Materia / especialidad (soportamos ambos campos)
  if (materia && materia !== "todas" && materia !== "") {
    filter.$or = [{ materia }, { especialidad: materia }];
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

/* ------------------------- helper: HTML → texto plano --------------------- */

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

/* -------------------- helper: contexto textual para IA -------------------- */

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
    parts.push(`ÓRGANO: ${doc.organo || doc.salaSuprema}`);
  }

  if (doc.especialidad || doc.materia) {
    parts.push(`ESPECIALIDAD: ${doc.especialidad || doc.materia}`);
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

  // Contenido completo / ficha (Fase B: cuando tengamos ficha HTML o texto extraído)
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

/* ----------------------- helper: meta compacto (Fase B) ------------------- */

function buildMetaFromDoc(doc) {
  const safePdfUrl = doc.pdfUrl || doc.urlResolucion || null;

  return {
    titulo: doc.titulo,
    numeroExpediente: doc.numeroExpediente,
    tipoResolucion: doc.tipoResolucion,
    recurso: doc.recurso,
    salaSuprema: doc.salaSuprema,
    organo: doc.organo,
    especialidad: doc.especialidad || doc.materia,
    fechaResolucion: doc.fechaResolucion,
    fuente: doc.fuente,
    fuenteUrl: doc.fuenteUrl || doc.urlResolucion || safePdfUrl,
    pdfUrl: safePdfUrl,
  };
}

/* ---------------- helper: normalizar item para el frontend ---------------- */

function normalizeItemForFrontend(doc) {
  const safeId = String(doc._id || "");
  const safePdfUrl = doc.pdfUrl || doc.urlResolucion || null;

  return {
    ...doc,
    id: safeId, // por si el front prefiere id en lugar de _id
    pdfUrl: safePdfUrl,
    origen: doc.origen || doc.fuente || "JNS",
    hasContenido: !!(doc.contenidoHTML || doc.texto),
  };
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

    const hayTexto = q && q.trim().length > 0;

    const filter = buildFilter({
      q: hayTexto ? q : "",
      materia,
      organo,
      estado,
      tipo,
    });

    const lim = Math.min(parseInt(limit, 10) || 50, 100);

    // Proyección base para listado (no mandamos contenidoHTML pesado)
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
      pdfUrl: 1,
      createdAt: 1,
      destacada: 1,
      destacado: 1,
      citadaCount: 1,
    };

    let query;

    if (hayTexto) {
      // 🔍 Búsqueda por texto completo: orden por relevancia (score)
      projection.score = { $meta: "textScore" };

      query = Jurisprudencia.find(filter, projection).sort({
        score: { $meta: "textScore" },
      });
    } else {
      // Orden según tipo (sin texto)
      const sort = buildSort(tipo);
      query = Jurisprudencia.find(filter, projection).sort(sort);
    }

    const rawItems = await query.limit(lim).lean();

    const items = rawItems.map((doc) => normalizeItemForFrontend(doc));

    return res.json({
      ok: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[API] GET /api/jurisprudencia error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al consultar jurisprudencia interna.",
    });
  }
});

/* ------------------ GET /api/jurisprudencia/:id/pdf ----------------------- */
/* Proxy de PDF para visor + descarga (Fase B listo) */

router.get("/:id/pdf", async (req, res) => {
  try {
    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc || !(doc.urlResolucion || doc.pdfUrl)) {
      return res
        .status(404)
        .json({ ok: false, error: "pdf_not_found", msg: "PDF no disponible." });
    }

    const pdfUrl = doc.pdfUrl || doc.urlResolucion;
    const download =
      String(req.query.download || "").toLowerCase() === "1";

    // Queremos distinguir:
    // - Llamados "técnicos" (future XHR)  -> JSON
    // - Llamados desde iframe/botón       -> HTML/PDF
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

      // Si explícitamente pidieron JSON, respetamos eso
      if (wantsJson) {
        return res.status(502).json({
          ok: false,
          error: "upstream_error",
          msg: "No se pudo obtener el PDF desde la fuente original.",
        });
      }

      // 👇 Fallback amable para el iframe:
      // mostramos una mini-página HTML con mensaje + botón para abrir el PDF oficial.
      const safePdfUrl = pdfUrl;
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
    <a class="btn" href="${safePdfUrl}" target="_blank" rel="noopener noreferrer">
      Abrir PDF oficial del Poder Judicial
    </a>
  </div>
</body>
</html>`);
      return;
    }

    // Si llegamos aquí, sí tenemos stream de PDF ✅

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
/* Contexto textual compacto para LitisBot (Fase B) */

router.get("/:id/context", async (req, res) => {
  try {
    const doc = await Jurisprudencia.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    const context = buildContextFromDoc(doc);
    const meta = buildMetaFromDoc(doc);
    const item = normalizeItemForFrontend(doc);

    return res.json({
      ok: true,
      id: String(doc._id),
      context,
      meta,
      item,
    });
  } catch (err) {
    console.error("[API] /api/jurisprudencia/:id/context error:", err);
    return res.status(500).json({
      ok: false,
      error: "internal_error",
      msg: "Error al generar el contexto de la resolución.",
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
