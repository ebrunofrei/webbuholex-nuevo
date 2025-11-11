// backend/routes/ia.js
// ============================================================
// 🦉 BÚHOLEX | IA unificada (chat + test) — versión robusta prod
// - Inyección de CITAS (normas / jurisprudencia / precedentes / doctrina)
// - Validación y normalización de inputs
// - Rate limit ligero (IP/usuario)
// - Timeouts/abort para provider
// - Manejo de errores consistente
// - Respeta el contrato actual del frontend (+ campo opcional: citations)
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import {
  obtenerHistorialUsuario,
  guardarHistorial,
} from "../services/memoryService.js";

// 🔎 Búsqueda normalizada de fuentes (sin HTTP, directo al servicio)
import { researchSearch } from "../services/research/index.js";

const router = express.Router();

// ----------------------- Config (env) -----------------------
const OPENAI_MODEL       = process.env.OPENAI_MODEL || "gpt-4o-mini";
const IA_MAX_TOKENS      = Number(process.env.IA_MAX_TOKENS || 1400);
const IA_TIMEOUT_MS      = Number(process.env.IA_TIMEOUT_MS || 20_000); // 20s
const IA_RATE_LIMIT_IP   = Number(process.env.IA_RATE_LIMIT_IP || 30);   // por 5 min
const IA_RATE_LIMIT_USER = Number(process.env.IA_RATE_LIMIT_USER || 60); // por 5 min
const IA_EXPECTS_CITATIONS_DEFAULT = String(process.env.IA_EXPECTS_CITATIONS_DEFAULT || "true") === "true";

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
- Usa SOLO las fuentes proporcionadas cuando cites; si no hay fuentes, avisa expresamente.
Salida: ${idioma}. Tono formal y claro.`.trim();

const promptAnalisisJuridico = ({ idioma, pais }) => `
Eres LitisBot, analista jurídico procesal.
Analiza motivación, congruencia, razonabilidad y debido proceso; sugiere defensas/recursos sin prometer resultados.
Cuando cites, usa EXCLUSIVAMENTE las fuentes proporcionadas.
Estructura: 1) Resumen 2) Fortalezas 3) Debilidades/vicios 4) Argumentos 5) Riesgos.
País base: ${pais}. Responde en ${idioma}.`.trim();

const promptTraduccion = ({ idioma, pais }) => `
Eres LitisBot, intérprete legal multilingüe.
Traduce/explica el contenido legal manteniendo sentido jurídico; en lenguas originarias, registro digno y claro.
No inventes citas: usa solo las proporcionadas si las hay.
Contexto base: ${pais}. Responde en ${idioma}.`.trim();

const promptGeneral = ({ idioma, pais }) => `
Eres LitisBot, asesor legal práctico.
Orienta con pasos concretos (plazos, entidad, qué pedir), riesgos y vías de defensa.
Si citas normas/jurisprudencia, usa ÚNICAMENTE las fuentes proporcionadas.
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
}

// ------------------- Citations helpers ----------------------
function guessTipoFromQuery(q) {
  const s = (q || "").toLowerCase();
  if (/(precedente|vinculante|tc|constitucional)/.test(s)) return "precedente";
  if (/(casación|casacion|sentencia|expediente)/.test(s))  return "jurisprudencia";
  if (/(ley|decreto|norma|reglamento|artículo|articulo)/.test(s)) return "norma";
  if (/(doctrina|tratado|autor|scielo|revista)/.test(s))   return "doctrina";
  return "general";
}

function stringifyCitations(citations = []) {
  if (!citations.length) return "— (no se encontraron fuentes confiables)";
  return citations.map((c, i) => `(${i + 1}) [${c.source}] ${c.title} — ${c.url}${c.date ? ` — ${c.date}` : ""}`).join("\n");
}

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
      expectsCitations = IA_EXPECTS_CITATIONS_DEFAULT,
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

    // 🔎 CITAS: búsqueda previa (sin bloquear si falla)
    let citations = [];
    if (expectsCitations) {
      try {
        const tipo = guessTipoFromQuery(userPromptLimpio);
        citations = await researchSearch({ q: userPromptLimpio, tipo });
      } catch (e) {
        console.warn("⚠️ researchSearch falló:", e?.message || e);
      }
    }

    // Prompt del usuario con fuentes inyectadas
    const userPromptConFuentes =
      `Consulta del usuario:\n${userPromptLimpio}\n\n` +
      `Fuentes disponibles (úsalas para sustentar, no inventes):\n` +
      `${stringifyCitations(citations)}\n\n` +
      `Instrucciones de cita: cuando uses una fuente, referencia [n] al final del párrafo pertinente. ` +
      `Cierra la respuesta con una sección "Citas usadas" listando (n) título — URL.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio,
      ...historialCliente,
      { role: "user", content: userPromptConFuentes },
    ];

    console.log(
      chalk.cyanBright(
        `📨 [IA] intent:${intencion} | mat:${materiaDetectada} | ${idiomaNorm} | ${paisNorm} | user:${usuarioId} | exp:${expedienteId} | cites:${citations.length}`
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
      { intencion, materiaDetectada, idioma: idiomaNorm, pais: paisNorm, modo, userEmail, citationsCount: citations.length }
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

    // 🔁 CONTRATO + citas (campo adicional no rompedor)
    return safeJSON(res, 200, {
      ok: true,
      respuesta,
      intencion,
      modoDetectado: modo,
      materiaDetectada,
      idioma: idiomaNorm,
      pais: paisNorm,
      sugerencias,
      citations, // <-- NUEVO: array [{title,url,source,date}]
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
