// backend/routes/ia.js
// ============================================================
// 🦉 BÚHOLEX | Ruta unificada de Inteligencia Artificial (IA)
// - Chat jurídico general
// - Integración con repositorio de Jurisprudencia (gestor de contexto)
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import {
  obtenerHistorialUsuario,
  guardarHistorial,
} from "../services/memoryService.js";
import Jurisprudencia from "../models/Jurisprudencia.js";

const router = express.Router();

/* --------------------- Materias rápidas -------------------- */

const materias = [
  {
    key: "civil",
    keywords: [
      "contrato",
      "obligación",
      "obligacion",
      "propiedad",
      "arrendamiento",
      "posesión",
      "posesion",
      "familia",
      "sucesión",
      "sucesion",
    ],
  },
  {
    key: "penal",
    keywords: [
      "delito",
      "acusación",
      "acusacion",
      "pena",
      "condena",
      "sentencia penal",
      "procesado",
    ],
  },
  {
    key: "laboral",
    keywords: [
      "trabajador",
      "empleador",
      "despido",
      "sindicato",
      "remuneración",
      "remuneracion",
      "planilla",
    ],
  },
  {
    key: "constitucional",
    keywords: [
      "derechos fundamentales",
      "amparo",
      "hábeas corpus",
      "habeas corpus",
      "tribunal constitucional",
    ],
  },
  {
    key: "administrativo",
    keywords: [
      "procedimiento administrativo",
      "osce",
      "silencio administrativo",
      "resolución administrativa",
      "resolucion administrativa",
      "tupa",
      "sunafil",
      "municipalidad",
    ],
  },
  {
    key: "tributario",
    keywords: [
      "impuesto",
      "sunat",
      "tributo",
      "declaración jurada",
      "declaracion jurada",
      "arbitrios",
    ],
  },
  {
    key: "comercial",
    keywords: [
      "sociedad",
      "empresa",
      "accionista",
      "factoring",
      "contrato mercantil",
      "acreedor",
      "deudor comercial",
    ],
  },
  {
    key: "procesal",
    keywords: [
      "demanda",
      "apelación",
      "apelacion",
      "casación",
      "casacion",
      "proceso judicial",
      "medida cautelar",
    ],
  },
  {
    key: "internacional",
    keywords: [
      "corte interamericana",
      "tratado",
      "extradición",
      "extradicion",
      "derecho internacional",
    ],
  },
  {
    key: "informatico",
    keywords: [
      "ciberseguridad",
      "protección de datos",
      "proteccion de datos",
      "hábeas data",
      "habeas data",
      "delitos informáticos",
      "delitos informaticos",
      "informatico",
    ],
  },
];

/* -------------------- Clasificador intención -------------------- */

function clasificarIntencion(tRaw = "") {
  const t = String(tRaw || "").toLowerCase();

  // Traducción / lenguas
  if (
    t.includes("traduce") ||
    t.includes("tradúceme") ||
    t.includes("traduceme") ||
    t.includes("traducir") ||
    t.includes("explica en quechua") ||
    t.includes("explica en aimara") ||
    t.includes("dime en inglés") ||
    t.includes("dime en ingles") ||
    t.includes("en portugués") ||
    t.includes("en portugues") ||
    t.includes("tradúcelo") ||
    t.includes("traducelo")
  ) {
    return "traduccion";
  }

  // Redacción de documentos
  if (
    t.includes("redacta") ||
    t.includes("redáctame") ||
    t.includes("redactame") ||
    t.includes("elabora") ||
    t.includes("escribe") ||
    t.includes("modelo de") ||
    t.includes("formato de") ||
    t.includes("plantilla de") ||
    t.includes("minuta de") ||
    t.includes("recurso de apelación") ||
    t.includes("recurso de apelacion") ||
    t.includes("demanda") ||
    t.includes("carta notarial") ||
    t.includes("informe jurídico") ||
    t.includes("informe juridico") ||
    t.includes("informe legal") ||
    t.includes("oficio") ||
    t.includes("descargo administrativo") ||
    t.includes("reclamo administrativo") ||
    t.includes("contrato")
  ) {
    return "redaccion";
  }

  // Análisis de resoluciones / motivación
  if (
    t.includes("analiza esta resolución") ||
    t.includes("analiza esta resolucion") ||
    t.includes("analiza esta sentencia") ||
    t.includes("está bien motivada") ||
    t.includes("esta bien motivada") ||
    t.includes("motivación suficiente") ||
    t.includes("motivacion suficiente") ||
    t.includes("motivación aparente") ||
    t.includes("motivacion aparente") ||
    t.includes("vulneración del debido proceso") ||
    t.includes("vulneracion del debido proceso") ||
    t.includes("incongruencia procesal") ||
    t.includes("proporcionalidad de la medida") ||
    t.includes("arbitrariedad del juez") ||
    t.includes("acto arbitrario")
  ) {
    return "analisis_juridico";
  }

  return "consulta_general";
}

/* -------------------- Prompts por intención -------------------- */

function promptRedaccion({ idioma, pais, hasJurisContext }) {
  const extra = hasJurisContext
    ? "\nSi se proporciona contexto de jurisprudencia, úsalo para fundamentar el documento sin inventar citas ni resultados procesales."
    : "";
  return `
Eres LitisBot, asistente jurídico y documentalista profesional.
- Redacta documentos formales completos con estructura real (encabezado, fundamentos, petitorio/solicitud, cierre, anexos).
- Si faltan datos, usa [CORCHETES] (p. ej. [NOMBRE], [DNI], [MONTO], [FECHA]).
- Adapta al país base ${pais} salvo indicación distinta.${extra}
- Cierra con: "Este es un borrador inicial que debe ser revisado o adaptado por un profesional antes de su presentación oficial."
Salida: ${idioma}. Tono formal y claro.
`.trim();
}

function promptAnalisisJuridico({ idioma, pais, hasJurisContext }) {
  const extra = hasJurisContext
    ? "\nSi se proporciona contexto de jurisprudencia, analiza esa resolución y relaciónala con la consulta sin atribuirle efectos automáticos."
    : "";
  return `
Eres LitisBot, analista jurídico procesal.
Analiza motivación, congruencia, razonabilidad y debido proceso; sugiere defensas/recursos sin prometer resultados.${extra}
Estructura: 1) Resumen 2) Fortalezas 3) Debilidades/vicios 4) Argumentos 5) Riesgos.
País base: ${pais}. Responde en ${idioma}.
`.trim();
}

function promptTraduccion({ idioma, pais, hasJurisContext }) {
  const extra = hasJurisContext
    ? "\nSi hay contexto de jurisprudencia, traduce o explica el contenido manteniendo su precisión jurídica."
    : "";
  return `
Eres LitisBot, intérprete legal multilingüe.
Traduce/explica el contenido legal manteniendo sentido jurídico; en lenguas originarias, registro digno y claro.${extra}
Contexto base: ${pais}. Responde en ${idioma}.
`.trim();
}

function promptGeneral({ idioma, pais, hasJurisContext }) {
  const extra = hasJurisContext
    ? "\nSi se proporciona contexto de jurisprudencia, úsalo como referencia para orientar la respuesta, citándolo de forma clara sin inventar contenido."
    : "";
  return `
Eres LitisBot, asesor legal práctico.
Orienta con pasos concretos (plazos, entidad, qué pedir), riesgos y vías de defensa. Si es urgente, sugiere asistencia presencial.${extra}
País base: ${pais}. Responde en ${idioma}.
`.trim();
}

function buildSystemPrompt({ intencion, idioma, pais, hasJurisContext }) {
  switch (intencion) {
    case "redaccion":
      return promptRedaccion({ idioma, pais, hasJurisContext });
    case "analisis_juridico":
      return promptAnalisisJuridico({ idioma, pais, hasJurisContext });
    case "traduccion":
      return promptTraduccion({ idioma, pais, hasJurisContext });
    default:
      return promptGeneral({ idioma, pais, hasJurisContext });
  }
}

/* ---------------------- Helpers de sanitizado ---------------------- */

function limpiarPromptUsuario(str = "") {
  if (typeof str !== "string") return "";
  const base = str
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return base.slice(0, 8000);
}

function detectarMateria(texto = "", materiaFallback = "general") {
  const t = String(texto).toLowerCase();
  for (const m of materias) {
    if (m.keywords.some((k) => t.includes(k))) {
      return m.key;
    }
  }
  return materiaFallback;
}

function normalizarHistorialCliente(historial) {
  if (!Array.isArray(historial)) return [];
  return historial
    .filter((h) => h && h.role && h.content)
    .map((h) => ({
      role: h.role === "assistant" ? "assistant" : "user",
      content: limpiarPromptUsuario(h.content),
    }));
}

function recortarHistorialMensajes(messages, maxChars = 16_000) {
  let total = messages.reduce(
    (acc, m) => acc + (m.content?.length || 0),
    0
  );
  if (total <= maxChars) return messages;

  const recortados = [messages[0]]; // preserva siempre el system principal
  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    total -= msg.content?.length || 0;
    if (total <= maxChars) {
      recortados.push(msg);
    }
  }
  return recortados;
}

/* ----------------- Helpers de jurisprudencia (contexto) ------------------ */

function htmlToPlain(html = "") {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildJurisContextFromDoc(doc) {
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

  if (Array.isArray(doc.palabrasClave) && doc.palabrasClave.length) {
    parts.push(`PALABRAS CLAVE: ${doc.palabrasClave.join(", ")}`);
  }

  if (doc.sumilla) {
    parts.push(`SUMILLA:\n${doc.sumilla}`);
  }

  if (doc.resumen) {
    parts.push(`RESUMEN:\n${doc.resumen}`);
  }

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

/**
 * Obtiene contexto concatenado de varias resoluciones seleccionadas.
 * ids: array de ObjectId en string.
 */
async function obtenerContextoJurisprudencia(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { text: "", metas: [] };
  }

  const lim = Math.min(ids.length, 5); // no más de 5 sentencias por vez

  const docs = await Jurisprudencia.find(
    { _id: { $in: ids.slice(0, lim) } },
    {
      titulo: 1,
      numeroExpediente: 1,
      tipoResolucion: 1,
      recurso: 1,
      salaSuprema: 1,
      organo: 1,
      especialidad: 1,
      materia: 1,
      fechaResolucion: 1,
      pretensionDelito: 1,
      normaDerechoInterno: 1,
      palabrasClave: 1,
      sumilla: 1,
      resumen: 1,
      contenidoHTML: 1,
      fundamentos: 1,
      baseLegal: 1,
      parteResolutiva: 1,
      fuente: 1,
      fuenteUrl: 1,
      urlResolucion: 1,
    }
  ).lean();

  if (!docs.length) {
    return { text: "", metas: [] };
  }

  const bloques = [];
  const metas = [];

  for (const d of docs) {
    const ctx = buildJurisContextFromDoc(d);
    if (!ctx) continue;

    bloques.push(ctx);

    metas.push({
      id: String(d._id),
      titulo: d.titulo,
      numeroExpediente: d.numeroExpediente,
      tipoResolucion: d.tipoResolucion,
      recurso: d.recurso,
      salaSuprema: d.salaSuprema,
      organo: d.organo,
      especialidad: d.especialidad || d.materia,
      fechaResolucion: d.fechaResolucion,
      fuente: d.fuente,
      fuenteUrl: d.fuenteUrl || d.urlResolucion,
    });
  }

  const texto = bloques.join("\n\n-----\n\n");
  return { text: texto, metas };
}

/* =========================== /api/ia/chat =========================== */

router.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error(chalk.redBright("❌ Falta OPENAI_API_KEY"));
      return res
        .status(500)
        .json({ ok: false, error: "Falta OPENAI_API_KEY" });
    }

    const {
      prompt,
      usuarioId = "invitado",
      expedienteId = "default",
      idioma = "es-PE",
      pais = "Perú",
      modo = "general", // compat con front
      materia = "general", // compat con front
      historial = [], // opcional desde el front
      userEmail = "", // opcional

      // 🔗 Integración con gestor de jurisprudencia
      jurisprudenciaId,
      jurisId,
      selectedJurisId,
      jurisprudenciaIds,
      jurisIds,
      jurisTexto,
    } = req.body || {};

    const userPromptLimpio = limpiarPromptUsuario(prompt);
    if (!userPromptLimpio || userPromptLimpio.length < 3) {
      return res.status(400).json({ ok: false, error: "Falta prompt" });
    }

    // IDs de jurisprudencia solicitados (distintas variantes de naming)
    const idsSolicitadosRaw = [
      jurisprudenciaId,
      jurisId,
      selectedJurisId,
      ...(Array.isArray(jurisprudenciaIds) ? jurisprudenciaIds : []),
      ...(Array.isArray(jurisIds) ? jurisIds : []),
    ].filter(Boolean);

    const idsSolicitados = Array.from(new Set(idsSolicitadosRaw.map(String)));

    // Materia detectada
    const materiaDetectada = detectarMateria(userPromptLimpio, materia);

    // Contexto de jurisprudencia (si hay IDs)
    let jurisContextText = "";
    let jurisMetas = [];
    if (idsSolicitados.length > 0) {
      try {
        const { text, metas } = await obtenerContextoJurisprudencia(
          idsSolicitados
        );
        jurisContextText = text;
        jurisMetas = metas;
      } catch (errCtx) {
        console.warn(
          chalk.yellowBright(
            `⚠ No se pudo obtener contexto de jurisprudencia para IDs [${idsSolicitados.join(
              ", "
            )}]: ${errCtx.message}`
          )
        );
      }
    }

    // 🔁 Si no pudimos armar contexto desde Mongo, pero el front envió texto, úsalo
    if (!jurisContextText && typeof jurisTexto === "string") {
      const limpio = jurisTexto.trim();
      if (limpio) {
        jurisContextText = limpio;
        // En este caso no tenemos metas estructuradas
        jurisMetas = [];
      }
    }

    const tieneJurisContext = !!jurisContextText;

    // Intención / system prompt
    const intencion = clasificarIntencion(userPromptLimpio);
    const systemPrompt = buildSystemPrompt({
      intencion,
      idioma,
      pais,
      hasJurisContext: tieneJurisContext,
    });

    // Historial desde Mongo (si falla, seguimos sin tumbar el chat)
    let historialPrevio = [];
    try {
      const bruto = await obtenerHistorialUsuario(usuarioId, expedienteId);
      historialPrevio = Array.isArray(bruto)
        ? bruto.filter((m) => m && m.role && m.content)
        : [];
    } catch (errHist) {
      console.warn(
        chalk.yellowBright(
          `⚠ No se pudo cargar historial para ${usuarioId}/${expedienteId}: ${errHist.message}`
        )
      );
      historialPrevio = [];
    }

    // Historial que puede enviar el front
    const historialCliente = normalizarHistorialCliente(historial);

    let messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio,
      ...historialCliente,
    ];

    if (tieneJurisContext) {
      messages.push({
        role: "system",
        content:
          "Contexto de jurisprudencia seleccionada (no inventes información fuera de este contenido, úsalo solo como referencia):\n\n" +
          jurisContextText,
      });
    }

    messages.push({ role: "user", content: userPromptLimpio });

    messages = recortarHistorialMensajes(messages);

    console.log(
      chalk.cyanBright(
        `📨 [IA] intencion:${intencion} | materia:${materiaDetectada} | idioma:${idioma} | pais:${pais} | usuario:${usuarioId} | exp:${expedienteId} | jurisContext:${
          tieneJurisContext ? idsSolicitados.length : 0
        }`
      )
    );

    const temperatura =
      intencion === "redaccion"
        ? 0.4
        : intencion === "analisis_juridico"
        ? 0.5
        : 0.6;

    const respuesta = await callOpenAI(messages, {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 1400,
      temperature: temperatura,
    });

    // Guardar historial (si falla, no rompemos la respuesta al usuario)
    try {
      await guardarHistorial(
        usuarioId,
        expedienteId,
        userPromptLimpio,
        respuesta,
        {
          intencion,
          materiaDetectada,
          idioma,
          pais,
          modo,
          userEmail,
          jurisprudenciaIds: idsSolicitados,
          jurisprudenciaMeta: jurisMetas,
        }
      );
    } catch (errSave) {
      console.warn(
        chalk.yellowBright(
          `⚠ No se pudo guardar historial para ${usuarioId}/${expedienteId}: ${errSave.message}`
        )
      );
    }

    let sugerencias = [];
    if (intencion === "redaccion") {
      sugerencias = [
        "¿Incluyo fundamentos legales o jurisprudencia?",
        "¿Versión lista para presentar ante autoridad?",
        "¿Deseas traducir este documento?",
      ];
    } else if (intencion === "analisis_juridico") {
      sugerencias = [
        "¿Redacto un recurso basado en este análisis?",
        "¿Prefieres un resumen para tu cliente?",
        "¿Identifico riesgos procesales clave?",
      ];
    } else if (intencion === "traduccion") {
      sugerencias = [
        "¿Versión formal para autoridad?",
        "¿Explicación más simple para terceros?",
        "¿Redacto una carta/solicitud basada en esto?",
      ];
    } else {
      sugerencias = [
        "¿Te redacto un documento formal listo para copiar?",
        "¿Analizo si hay vicios en una resolución?",
        "¿Quieres que lo traduzca a otro idioma?",
      ];
    }

    console.log(
      chalk.greenBright(
        `✅ [IA] OK (${respuesta?.length || 0} chars) – ${intencion}`
      )
    );

    return res.json({
      ok: true,
      respuesta,
      intencion,
      modoDetectado: modo,
      materiaDetectada,
      idioma,
      pais,
      sugerencias,
      jurisprudenciaContexto: {
        usado: tieneJurisContext,
        cantidad: jurisMetas.length,
        resoluciones: jurisMetas,
      },
    });
  } catch (err) {
    console.error(chalk.redBright("❌ Error /api/ia/chat:"), err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Error interno del servicio de IA.",
    });
  }
});

/* ============================ /api/ia/test ============================ */

router.get("/test", async (_req, res) => {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Eres LitisBot, asistente jurídico de BúhoLex. Responde breve y claro.",
      },
      {
        role: "user",
        content: "¿Qué es la conciliación extrajudicial en Perú?",
      },
    ];
    const respuesta = await callOpenAI(messages, {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 200,
    });
    return res.json({ ok: true, respuesta });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
