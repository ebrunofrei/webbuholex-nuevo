// backend/routes/ia.js
// ============================================================
// 🦉 BÚHOLEX | Ruta unificada de Inteligencia Artificial (IA)
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import {
  obtenerHistorialUsuario,
  guardarHistorial,
} from "../services/memoryService.js";

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

function promptRedaccion({ idioma, pais }) {
  return `
Eres LitisBot, asistente jurídico y documentalista profesional.
- Redacta documentos formales completos con estructura real (encabezado, fundamentos, petitorio/solicitud, cierre, anexos).
- Si faltan datos, usa [CORCHETES] (p. ej. [NOMBRE], [DNI], [MONTO], [FECHA]).
- Adapta al país base ${pais} salvo indicación distinta.
- Cierra con: "Este es un borrador inicial que debe ser revisado o adaptado por un profesional antes de su presentación oficial."
Salida: ${idioma}. Tono formal y claro.
`.trim();
}

function promptAnalisisJuridico({ idioma, pais }) {
  return `
Eres LitisBot, analista jurídico procesal.
Analiza motivación, congruencia, razonabilidad y debido proceso; sugiere defensas/recursos sin prometer resultados.
Estructura: 1) Resumen 2) Fortalezas 3) Debilidades/vicios 4) Argumentos 5) Riesgos.
País base: ${pais}. Responde en ${idioma}.
`.trim();
}

function promptTraduccion({ idioma, pais }) {
  return `
Eres LitisBot, intérprete legal multilingüe.
Traduce/explica el contenido legal manteniendo sentido jurídico; en lenguas originarias, registro digno y claro.
Contexto base: ${pais}. Responde en ${idioma}.
`.trim();
}

function promptGeneral({ idioma, pais }) {
  return `
Eres LitisBot, asesor legal práctico.
Orienta con pasos concretos (plazos, entidad, qué pedir), riesgos y vías de defensa. Si es urgente, sugiere asistencia presencial.
País base: ${pais}. Responde en ${idioma}.
`.trim();
}

function buildSystemPrompt({ intencion, idioma, pais }) {
  switch (intencion) {
    case "redaccion":
      return promptRedaccion({ idioma, pais });
    case "analisis_juridico":
      return promptAnalisisJuridico({ idioma, pais });
    case "traduccion":
      return promptTraduccion({ idioma, pais });
    default:
      return promptGeneral({ idioma, pais });
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
      role: h.role,
      content: limpiarPromptUsuario(h.content),
    }));
}

function recortarHistorialMensajes(messages, maxChars = 16_000) {
  // Evita que el historial explote el contexto: recorta por la cola (antiguos primero)
  let total = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  if (total <= maxChars) return messages;

  const recortados = [messages[0]]; // preserva siempre el system
  for (let i = 1; i < messages.length; i++) {
    const msg = messages[i];
    total -= msg.content?.length || 0;
    if (total <= maxChars) {
      recortados.push(msg);
    }
  }
  return recortados;
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
    } = req.body || {};

    const userPromptLimpio = limpiarPromptUsuario(prompt);
    if (!userPromptLimpio || userPromptLimpio.length < 3) {
      return res.status(400).json({ ok: false, error: "Falta prompt" });
    }

    // Materia detectada
    const materiaDetectada = detectarMateria(userPromptLimpio, materia);

    // Intención / system prompt
    const intencion = clasificarIntencion(userPromptLimpio);
    const systemPrompt = buildSystemPrompt({ intencion, idioma, pais });

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
          `⚠ No se pudo cargar historial para ${usuarioId}/${expedienteId}:`,
          errHist.message
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
      { role: "user", content: userPromptLimpio },
    ];

    messages = recortarHistorialMensajes(messages);

    console.log(
      chalk.cyanBright(
        `📨 [IA] intencion:${intencion} | materia:${materiaDetectada} | ${idioma} | ${pais} | usuario:${usuarioId} | exp:${expedienteId}`
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
        { intencion, materiaDetectada, idioma, pais, modo, userEmail }
      );
    } catch (errSave) {
      console.warn(
        chalk.yellowBright(
          `⚠ No se pudo guardar historial para ${usuarioId}/${expedienteId}:`,
          errSave.message
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
