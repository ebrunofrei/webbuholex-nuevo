// ============================================================
// 🦉 BÚHOLEX | Ruta unificada de Inteligencia Artificial (IA)
// ------------------------------------------------------------
// Capacidades principales:
//  - Redacción de documentos (judiciales, administrativos, privados,
//    corporativos, cartas notariales, contratos, descargos, etc.)
//  - Análisis de motivación judicial / administrativa
//    (debido proceso, motivación suficiente vs aparente, proporcionalidad)
//  - Traducción / interpretación jurídica multilingüe (es-PE, qu-PE, ay-BO...)
//  - Orientación legal práctica con pasos accionables
//
// Persistencia:
//  - Conversación y contexto se guardan en MongoDB por usuario + expediente.
//  - Cada turno queda trazable (auditoría legal).
//
// Seguridad / economía:
//  - Limitamos tamaño del prompt recibido (anti bomba de texto infinita).
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import {
  obtenerHistorialUsuario,
  guardarHistorial,
} from "../services/memoryService.js";

const router = express.Router();

/* ------------------------------------------------------------
   ⚖️ Clasificación automática de materias jurídicas (rápida)
   (sirve para etiquetar la conversación y para analytics)
------------------------------------------------------------ */
const materias = [
  { key: "civil", keywords: ["contrato", "obligación", "obligacion", "propiedad", "arrendamiento", "posesión", "posesion", "familia", "sucesión", "sucesion"] },
  { key: "penal", keywords: ["delito", "acusación", "acusacion", "pena", "condena", "sentencia penal", "procesado"] },
  { key: "laboral", keywords: ["trabajador", "empleador", "despido", "sindicato", "remuneración", "remuneracion", "planilla"] },
  { key: "constitucional", keywords: ["derechos fundamentales", "amparo", "hábeas corpus", "habeas corpus", "tribunal constitucional"] },
  { key: "administrativo", keywords: ["procedimiento administrativo", "osce", "silencio administrativo", "resolución administrativa", "resolucion administrativa", "tupa", "sunafil", "municipalidad"] },
  { key: "tributario", keywords: ["impuesto", "sunat", "tributo", "declaración jurada", "declaracion jurada", "arbitrios"] },
  { key: "comercial", keywords: ["sociedad", "empresa", "accionista", "factoring", "contrato mercantil", "acreedor", "deudor comercial"] },
  { key: "procesal", keywords: ["demanda", "apelación", "apelacion", "casación", "casacion", "proceso judicial", "medida cautelar"] },
  { key: "internacional", keywords: ["corte interamericana", "tratado", "extradición", "extradicion", "derecho internacional"] },
  { key: "informatico", keywords: ["ciberseguridad", "protección de datos", "proteccion de datos", "hábeas data", "habeas data", "delitos informáticos", "delitos informaticos", "informatico"] },
];

/* ------------------------------------------------------------
   🎯 Clasificador de intención (documentos / análisis / traducción / general)
   Si el usuario pide "redacta", vamos a modo documento.
   Si pide "analiza si está bien motivada", vamos a modo análisis procesal.
   Etc.
------------------------------------------------------------ */
function clasificarIntencion(textoRaw = "") {
  const t = (textoRaw || "").toLowerCase();

  // Traducción / interpretación
  if (
    t.includes("traduce") || t.includes("tradúceme") || t.includes("traduceme") || t.includes("traducir") ||
    t.includes("explica en quechua") || t.includes("explica en aimara") ||
    t.includes("dime en inglés") || t.includes("dime en ingles") ||
    t.includes("en portugués") || t.includes("en portugues") ||
    t.includes("tradúcelo") || t.includes("traducelo")
  ) {
    return "traduccion";
  }

  // Redacción de documentos (judicial / administrativo / privado / corporativo)
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
  ) {
    return "redaccion";
  }

  // Análisis jurídico / motivación / debido proceso
  if (
    t.includes("analiza esta resolución") || t.includes("analiza esta resolucion") ||
    t.includes("analiza esta sentencia") ||
    t.includes("está bien motivada") || t.includes("esta bien motivada") ||
    t.includes("motivación suficiente") || t.includes("motivacion suficiente") ||
    t.includes("motivación aparente") || t.includes("motivacion aparente") ||
    t.includes("vulneración del debido proceso") || t.includes("vulneracion del debido proceso") ||
    t.includes("incongruencia procesal") ||
    t.includes("proporcionalidad de la medida") ||
    t.includes("arbitrariedad del juez") || t.includes("acto arbitrario")
  ) {
    return "analisis_juridico";
  }

  return "consulta_general";
}

/* ------------------------------------------------------------
   🧱 Prompts especializados según intención detectada
   Estos prompts definen el "rol mental" del modelo.
------------------------------------------------------------ */

function promptRedaccion({ idioma, pais }) {
  return `
Eres LitisBot, asistente jurídico y documentalista profesional.

TU TAREA:
- Redactar documentos formales completos según lo que pida el usuario.
- Puedes generar: demandas, escritos judiciales, recursos impugnatorios,
  descargos administrativos, cartas notariales, contratos civiles o laborales,
  comunicaciones corporativas, cartas simples, correos formales,
  informes jurídicos y técnicos, etc.
- Emplea estructura real (encabezado, fundamentos, petitorio/solicitud,
  cierre, anexos si aplica).
- Si faltan datos, usa [CORCHETES] (p. ej. [NOMBRE], [DNI], [MONTO], [FECHA]).
- Adapta al país base ${pais} salvo que el usuario indique otro.
- Al final agrega SIEMPRE:
  "Este es un borrador inicial que debe ser revisado o adaptado por un profesional
   antes de su presentación oficial."

LENGUAJE DE SALIDA: ${idioma}.
Tono formal, claro y profesional, acorde al tipo de documento.
`.trim();
}

function promptAnalisisJuridico({ idioma, pais }) {
  return `
Eres LitisBot, analista jurídico procesal.

Analiza la validez y motivación de actos judiciales o administrativos:
- ¿Hay motivación fáctica y jurídica? ¿Es suficiente o solo aparente?
- ¿Existe congruencia entre lo pedido y lo resuelto?
- ¿La medida es razonable, proporcional y fundamentada?
- ¿Se respetó el debido proceso y el derecho de defensa?
- ¿Hay riesgos de arbitrariedad, incongruencia procesal, incompetencia o
  incumplimiento de plazos?

Estructura tu respuesta en:
1) Resumen del acto.
2) Fortalezas.
3) Debilidades / posibles vicios.
4) Argumentos de defensa / impugnación sugeridos.
5) Riesgos.

No prometas resultados, habla en términos de "podría argumentarse que..."
y "es posible cuestionar...".

País base: ${pais}.
Responde en: ${idioma}, técnico pero claro para un usuario humano.
`.trim();
}

function promptTraduccion({ idioma, pais }) {
  return `
Eres LitisBot, intérprete legal multilingüe.

Traduce o explica el contenido legal al idioma solicitado con respeto cultural:
- Mantén el sentido jurídico sin distorsionar.
- En lenguas originarias (quechua, aimara) usa un registro digno y claro,
  evita caricaturizar o infantilizar.
- En inglés/portugués, mantén tono formal entendible por no abogados.
- Si el concepto es complejo, da ejemplos prácticos.

Contexto legal base: ${pais}.
Responde en: ${idioma}.
`.trim();
}

function promptGeneral({ idioma, pais }) {
  return `
Eres LitisBot, asesor legal práctico.

Objetivo:
- Orientar al usuario sobre su situación legal, administrativa,
  contractual o laboral.
- Indicar pasos concretos (plazos, ante qué entidad ir, qué pedir,
  qué documento presentar).
- Explicar riesgos y vías de defensa.
- Si parece urgente, sugiere asistencia presencial.
- No prometas resultados; habla en términos de opciones y estrategias.

País base: ${pais}.
Responde en: ${idioma}, claro y empático.
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

    case "consulta_general":
    default:
      return promptGeneral({ idioma, pais });
  }
}

/* ------------------------------------------------------------
   🔒 Helper de saneamiento de prompt de usuario
   - Evita que nos manden 200k caracteres y nos fundan la API.
------------------------------------------------------------ */
function limpiarPromptUsuario(str = "") {
  if (!str || typeof str !== "string") return "";
  // limpiamos espacios absurdos pero SIN alterar contenido legal
  const base = str.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // límite duro para proteger costos (ajustable)
  return base.slice(0, 8000);
}

/* ------------------------------------------------------------
   🧩 Ruta principal → /api/ia/chat
------------------------------------------------------------ */
router.post("/chat", async (req, res) => {
  try {
    // ✅ Verificación temprana de entorno
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        chalk.redBright("❌ Falta configurar OPENAI_API_KEY en el entorno del servidor.")
      );
      return res.status(500).json({
        ok: false,
        error: "Falta configurar OPENAI_API_KEY en el entorno del servidor.",
      });
    }

    // 🧾 Cuerpo de la solicitud desde el frontend
    const {
      prompt,
      usuarioId = "invitado",
      expedienteId = "default",

      // contexto cultural / lingüístico
      idioma = "es-PE",   // "es-PE", "qu-PE", "ay-BO", "en-US", "pt-BR"
      pais = "Perú",      // País base para análisis normativo

      // compat legado con tu front
      modo = "general",
      materia = "general",
    } = req.body || {};

    // 🧼 Sanitizar entrada
    const userPromptLimpio = limpiarPromptUsuario(prompt);

    if (!userPromptLimpio || userPromptLimpio.length < 3) {
      return res.status(400).json({
        ok: false,
        error: "Falta o es inválido el prompt en la solicitud.",
      });
    }

    // ============================================================
    // 🧠 Detección automática de materia (etiqueta temática)
    // ============================================================
    let materiaDetectada = materia;
    {
      const texto = userPromptLimpio.toLowerCase();
      for (const m of materias) {
        if (m.keywords.some((k) => texto.includes(k))) {
          materiaDetectada = m.key;
          break;
        }
      }
    }

    // ============================================================
    // 🎯 Intención global de la consulta
    // ============================================================
    const intencion = clasificarIntencion(userPromptLimpio);

    // ============================================================
    // 🧱 Prompt "system" especializado según intención
    // ============================================================
    const systemPrompt = buildSystemPrompt({ intencion, idioma, pais });

    // ============================================================
    // 💬 Contexto conversacional desde MongoDB
    //    IMPORTANTE: ahora obtenerHistorialUsuario() ya devuelve
    //    [{role:"user",content:"..."}, {role:"assistant",content:"..."}...]
    //    en orden cronológico.
    // ============================================================
    const historialPrevio = await obtenerHistorialUsuario(
      usuarioId,
      expedienteId
    );

    // Construimos el payload final para el modelo:
    //  - systemPrompt va primero
    //  - luego todo el historial previo
    //  - último el mensaje limpio actual del usuario
    const messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio,
      { role: "user", content: userPromptLimpio },
    ];

    console.log(
      chalk.cyanBright(
        `📨 [IA] Solicitud → intencion:${intencion} | materia:${materiaDetectada} | idioma:${idioma} | pais:${pais} | usuario:${usuarioId} | expediente:${expedienteId}`
      )
    );

    // ============================================================
    // 🤖 Llamada a OpenAI vía servicio interno
    //    Ajustamos temperatura según intención:
    //    - Redacción de documento formal -> baja creatividad
    //    - Análisis jurídico -> también bajo
    //    - General / traducción -> un poco más flexible
    // ============================================================
    const temperatura =
      intencion === "redaccion"
        ? 0.4 // documento formal, voz seria
        : intencion === "analisis_juridico"
        ? 0.5 // análisis técnico, controlado
        : 0.6; // general / traducción, más natural

    const respuesta = await callOpenAI(messages, {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: 1400,
      temperature: temperatura,
    });

    // ============================================================
    // 💾 Guardar historial en MongoDB
    //    Guardamos tanto la pregunta como la respuesta,
    //    junto con metadata que nos sirve para auditoría
    //    y para el contexto futuro (idioma, país, materia, intención).
    // ============================================================
    await guardarHistorial(usuarioId, expedienteId, userPromptLimpio, respuesta, {
      intencion,
      materiaDetectada,
      idioma,
      pais,
    });

    // ============================================================
    // 💡 Sugerencias dinámicas para el frontend
    //    Estas se pueden mostrar como chips/botones bajo la respuesta.
    // ============================================================
    let sugerencias = [];
    if (intencion === "redaccion") {
      sugerencias = [
        "¿Incluyo fundamentos legales específicos o jurisprudencia?",
        "¿Quieres la versión lista para presentar ante una autoridad?",
        "¿Deseas traducir este documento a otro idioma?",
      ];
    } else if (intencion === "analisis_juridico") {
      sugerencias = [
        "¿Quieres que redacte un recurso basado en este análisis?",
        "¿Prefieres un resumen para explicarlo a tu cliente?",
        "¿Identifico riesgos procesales clave?",
      ];
    } else if (intencion === "traduccion") {
      sugerencias = [
        "¿Deseas la versión formal para autoridad?",
        "¿Necesitas una explicación más simple para familiares?",
        "¿Redacto una carta/solicitud basada en esto?",
      ];
    } else {
      sugerencias = [
        "¿Quieres que te redacte un documento formal listo para copiar?",
        "¿Deseas que analice si hay vicios en una resolución?",
        "¿Quieres que lo traduzca a otro idioma?",
      ];
    }

    console.log(
      chalk.greenBright(
        `✅ [IA] Respuesta OK (${respuesta?.length || 0} chars) — intención:${intencion}`
      )
    );

    // ============================================================
    // 📤 Respuesta final al frontend
    // ============================================================
    return res.json({
      ok: true,
      respuesta,          // texto final para mostrar en la burbuja del bot
      intencion,          // "redaccion", "analisis_juridico", etc.
      modoDetectado: modo, // compat legacy
      materiaDetectada,   // "civil", "laboral", etc.
      idioma,             // "es-PE" / "qu-PE" etc.
      pais,               // "Perú"
      sugerencias,        // array de strings para UI
    });
  } catch (err) {
    console.error(chalk.redBright("❌ Error interno en /api/ia/chat:"), err);

    return res.status(500).json({
      ok: false,
      error: err?.message || "Error interno del servicio de IA.",
    });
  }
});

/* ------------------------------------------------------------
   🧪 Ruta de prueba /api/ia/test (debug interno)
   Útil para probar conectividad con OpenAI sin pasar por el front.
------------------------------------------------------------ */
router.get("/test", async (_req, res) => {
  try {
    console.log(chalk.yellow("🧠 Ejecutando prueba directa de OpenAI..."));

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
    console.error(chalk.red(`❌ Error en /api/ia/test: ${err.message}`));
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
