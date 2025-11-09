// backend/routes/ia.js
// ============================================================
// 🦉 BÚHOLEX | IA unificada (chat + test) — versión robusta prod
// - Validación y normalización de inputs
// - Rate limit muy ligero (por IP/usuario)
// - Timeouts/abort para provider
// - Manejo de errores consistente y trazas mínimas
// - Respeta el contrato actual del frontend
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import {
  obtenerHistorialUsuario,
  guardarHistorial,
} from "../services/memoryService.js";

const router = express.Router();

// ----------------------- Config (env) -----------------------
const OPENAI_MODEL      = process.env.OPENAI_MODEL || "gpt-4o-mini";
const IA_MAX_TOKENS     = Number(process.env.IA_MAX_TOKENS || 1400);
const IA_TIMEOUT_MS     = Number(process.env.IA_TIMEOUT_MS || 20_000); // 20s
const IA_RATE_LIMIT_IP  = Number(process.env.IA_RATE_LIMIT_IP || 30);   // por 5 min
const IA_RATE_LIMIT_USER= Number(process.env.IA_RATE_LIMIT_USER || 60); // por 5 min

// ------------------ Materias / intención -------------------
const materias = [
  { key: "civil",           keywords: ["contrato","obligación","obligacion","propiedad","arrendamiento","posesión","posesion","familia","sucesión","sucesion"] },
  { key: "penal",           keywords: ["delito","acusación","acusacion","pena","condena","sentencia penal","procesado"] },
  { key: "laboral",         keywords: ["trabajador","empleador","despido","sindicato","remuneración","remuneracion","planilla"] },
  { key: "constitucional",  keywords: ["derechos fundamentales","amparo","hábeas corpus","habeas corpus","tribunal constitucional"] },
  { key: "administrativo",  keywords: ["procedimiento administrativo","osce","silencio administrativo","resolución administrativa","resolucion administrativa","tupa","sunafil","municipalidad"] },
  { key: "tributario",      keywords: ["impuesto","sunat","tributo","declaración jurada","declaracion jurada","arbitrios"] },
  { key: "comercial",       keywords: ["sociedad","empresa","accionista","factoring","contrato mercantil","acreedor","deudor comercial"] },
  { key: "procesal",        keywords: ["demanda","apelación","apelacion","casación","casacion","proceso judicial","medida cautelar"] },
  { key: "internacional",   keywords: ["corte interamericana","tratado","extradición","extradicion","derecho internacional"] },
  { key: "informatico",     keywords: ["ciberseguridad","protección de datos","proteccion de datos","hábeas data","habeas data","delitos informáticos","delitos informaticos","informatico"] },
];

function clasificarIntencion(tRaw = "") {
  const t = (tRaw || "").toLowerCase();

  if (
    t.includes("traduce") || t.includes("tradúceme") || t.includes("traduceme") ||
    t.includes("traducir") || t.includes("explica en quechua") || t.includes("explica en aimara") ||
    t.includes("dime en inglés") || t.includes("dime en ingles") ||
    t.includes("en portugués") || t.includes("en portugues") ||
    t.includes("tradúcelo") || t.includes("traducelo")
  ) return "traduccion";

  if (
    t.includes("redacta") || t.includes("redáctame") || t.includes("redactame") ||
    t.includes("elabora") || t.includes("escribe") ||
    t.includes("modelo de") || t.includes("formato de") || t.includes("plantilla de") || t.includes("minuta de") ||
    t.includes("recurso de apelación") || t.includes("recurso de apelacion") ||
    t.includes("demanda") || t.includes("carta notarial") ||
    t.includes("informe jurídico") || t.includes("informe juridico") ||
    t.includes("informe legal") || t.includes("oficio") ||
    t.includes("descargo administrativo") || t.includes("reclamo administrativo") ||
    t.includes("contrato")
  ) return "redaccion";

  if (
    t.includes("analiza esta resolución") || t.includes("analiza esta resolucion") ||
    t.includes("analiza esta sentencia") ||
    t.includes("está bien motivada") || t.includes("esta bien motivada") ||
    t.includes("motivación suficiente") || t.includes("motivacion suficiente") ||
    t.includes("motivación aparente") || t.includes("motivacion aparente") ||
    t.includes("vulneración del debido proceso") || t.includes("vulneracion del debido proceso") ||
    t.includes("incongruencia procesal") || t.includes("proporcionalidad de la medida") ||
    t.includes("arbitrariedad del juez") || t.includes("acto arbitrario")
  ) return "analisis_juridico";

  return "consulta_general";
}

const promptRedaccion = ({ idioma, pais }) => `
Eres LitisBot, asistente jurídico y documentalista profesional.
- Redacta documentos formales completos con estructura real (encabezado, fundamentos, petitorio/solicitud, cierre, anexos).
- Si faltan datos, usa [CORCHETES] (p. ej. [NOMBRE], [DNI], [MONTO], [FECHA]).
- Adapta al país base ${pais} salvo indicación distinta.
- Cierra con: "Este es un borrador inicial que debe ser revisado o adaptado por un profesional antes de su presentación oficial."
Salida: ${idioma}. Tono formal y claro.`.trim();

const promptAnalisisJuridico = ({ idioma, pais }) => `
Eres LitisBot, analista jurídico procesal.
Analiza motivación, congruencia, razonabilidad y debido proceso; sugiere defensas/recursos sin prometer resultados.
Estructura: 1) Resumen 2) Fortalezas 3) Debilidades/vicios 4) Argumentos 5) Riesgos.
País base: ${pais}. Responde en ${idioma}.`.trim();

const promptTraduccion = ({ idioma, pais }) => `
Eres LitisBot, intérprete legal multilingüe.
Traduce/explica el contenido legal manteniendo sentido jurídico; en lenguas originarias, registro digno y claro.
Contexto base: ${pais}. Responde en ${idioma}.`.trim();

const promptGeneral = ({ idioma, pais }) => `
Eres LitisBot, asesor legal práctico.
Orienta con pasos concretos (plazos, entidad, qué pedir), riesgos y vías de defensa. Si es urgente, sugiere asistencia presencial.
País base: ${pais}. Responde en ${idioma}.`.trim();

function buildSystemPrompt({ intencion, idioma, pais }) {
  switch (intencion) {
    case "redaccion":         return promptRedaccion({ idioma, pais });
    case "analisis_juridico": return promptAnalisisJuridico({ idioma, pais });
    case "traduccion":        return promptTraduccion({ idioma, pais });
    default:                  return promptGeneral({ idioma, pais });
  }
}

// ------------------- Helpers sanitización -------------------
function limpiarPromptUsuario(str = "") {
  if (!str || typeof str !== "string") return "";
  const base = str.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return base.slice(0, 8000);
}
const normLocale = (v, d) => String(v || d).toString().slice(0, 10);
const safeJSON = (res, code, payload) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(code).json(payload);
};

// ----------------------- Rate limiting ----------------------
const windowMs = 5 * 60 * 1000; // 5 minutos
const bucketIP   = new Map();   // ip -> [timestamps]
const bucketUser = new Map();   // usuarioId -> [timestamps]

function purgeOld(arr, now) {
  while (arr.length && now - arr[0] > windowMs) arr.shift();
}
function checkLimit(bucket, key, limit) {
  const now = Date.now();
  const arr = bucket.get(key) || [];
  purgeOld(arr, now);
  arr.push(now);
  bucket.set(key, arr);
  return arr.length <= limit;
}

// ======================== /api/ia/chat =======================
router.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error(chalk.redBright("❌ Falta OPENAI_API_KEY"));
      return safeJSON(res, 500, { ok: false, error: "Falta OPENAI_API_KEY" });
    }

    // --- Rate limit (IP + usuario) ---
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString();
    const userIdForLimit = String(req.body?.usuarioId || "invitado");
    if (!checkLimit(bucketIP, ip, IA_RATE_LIMIT_IP)) {
      return safeJSON(res, 429, { ok: false, error: "Demasiadas solicitudes desde esta IP. Intenta más tarde." });
    }
    if (!checkLimit(bucketUser, userIdForLimit, IA_RATE_LIMIT_USER)) {
      return safeJSON(res, 429, { ok: false, error: "Has realizado muchas solicitudes. Intenta más tarde." });
    }

    // --- Validación / normalización de inputs ---
    const {
      prompt,
      usuarioId    = "invitado",
      expedienteId = "default",
      idioma       = "es-PE",
      pais         = "Perú",
      modo         = "general",
      materia      = "general",
      historial    = [],
      userEmail    = "",
    } = req.body || {};

    const userPromptLimpio = limpiarPromptUsuario(prompt);
    if (userPromptLimpio.length < 3) {
      return safeJSON(res, 400, { ok: false, error: "Falta prompt" });
    }

    // Materia detectada (heurística)
    let materiaDetectada = materia;
    {
      const text = userPromptLimpio.toLowerCase();
      for (const m of materias) {
        if (m.keywords.some(k => text.includes(k))) { materiaDetectada = m.key; break; }
      }
    }

    const idiomaNorm = normLocale(idioma, "es-PE");
    const paisNorm   = normLocale(pais,   "Perú");
    const intencion  = clasificarIntencion(userPromptLimpio);
    const systemPrompt = buildSystemPrompt({ intencion, idioma: idiomaNorm, pais: paisNorm });

    // Historial persistido + del cliente
    const historialPrevio = await obtenerHistorialUsuario(usuarioId, expedienteId);
    const historialCliente = Array.isArray(historial)
      ? historial
          .filter(h => h && h.role && h.content)
          .map(h => ({ role: h.role, content: limpiarPromptUsuario(h.content) }))
      : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio,
      ...historialCliente,
      { role: "user", content: userPromptLimpio },
    ];

    console.log(
      chalk.cyanBright(
        `📨 [IA] intent:${intencion} | mat:${materiaDetectada} | ${idiomaNorm} | ${paisNorm} | user:${usuarioId} | exp:${expedienteId}`
      )
    );

    // Abort/timeout para el proveedor
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), IA_TIMEOUT_MS);

    let respuesta;
    try {
      respuesta = await callOpenAI(messages, {
        model: OPENAI_MODEL,
        max_tokens: IA_MAX_TOKENS,
        temperature:
          intencion === "redaccion" ? 0.4 :
          intencion === "analisis_juridico" ? 0.5 : 0.6,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(to);
    }

    // Persistencia mínima (no bloquear respuesta si falla)
    guardarHistorial(
      usuarioId,
      expedienteId,
      userPromptLimpio,
      respuesta,
      { intencion, materiaDetectada, idioma: idiomaNorm, pais: paisNorm, modo, userEmail }
    ).catch(err => console.warn("⚠️ No se pudo guardar historial:", err?.message || err));

    // Sugerencias contextuales
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

    console.log(chalk.greenBright(`✅ [IA] OK (${respuesta?.length || 0} chars) – ${intencion}`));

    return safeJSON(res, 200, {
      ok: true,
      respuesta,
      intencion,
      modoDetectado: modo,
      materiaDetectada,
      idioma: idiomaNorm,
      pais: paisNorm,
      sugerencias,
    });
  } catch (err) {
    const status =
      err?.name === "AbortError" ? 504 :
      /rate|quota|limit/i.test(err?.message || "") ? 429 : 500;

    console.error(chalk.redBright("❌ Error /api/ia/chat:"), err);
    return safeJSON(res, status, {
      ok: false,
      error: status === 504 ? "El proveedor tardó demasiado en responder." :
             err?.message || "Error interno del servicio de IA.",
    });
  }
});

// ======================== /api/ia/test =======================
router.get("/test", async (_req, res) => {
  try {
    const messages = [
      { role: "system", content: "Eres LitisBot, asistente jurídico de BúhoLex. Responde breve y claro." },
      { role: "user", content: "¿Qué es la conciliación extrajudicial en Perú?" },
    ];

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), Math.min(IA_TIMEOUT_MS, 8000));

    let respuesta;
    try {
      respuesta = await callOpenAI(messages, {
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 200,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(to);
    }

    return safeJSON(res, 200, { ok: true, respuesta });
  } catch (err) {
    return safeJSON(res, 500, { ok: false, error: err.message });
  }
});

export default router;
