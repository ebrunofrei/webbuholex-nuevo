// ============================================================
// 🧠 BÚHOLEX | Ruta unificada de Inteligencia Artificial (IA)
// ============================================================

import express from "express";
import chalk from "chalk";
import { callOpenAI } from "../services/openaiService.js";
import { obtenerHistorialUsuario, guardarHistorial } from "../services/memoryService.js";

const router = express.Router();

// ============================================================
// ⚖️ Clasificación automática de materias jurídicas
// ============================================================

const materias = [
  { key: "civil", keywords: ["contrato", "obligación", "propiedad", "arrendamiento", "posesión"] },
  { key: "penal", keywords: ["delito", "acusación", "pena", "condena", "sentencia penal"] },
  { key: "laboral", keywords: ["trabajador", "empleador", "despido", "sindicato", "remuneración"] },
  { key: "constitucional", keywords: ["derechos fundamentales", "amparo", "hábeas corpus", "tribunal constitucional"] },
  { key: "administrativo", keywords: ["procedimiento administrativo", "SBN", "OSCE", "resolución", "silencio administrativo"] },
  { key: "tributario", keywords: ["impuesto", "SUNAT", "tributo", "declaración jurada", "arbitrios"] },
  { key: "comercial", keywords: ["sociedad anónima", "empresa", "accionista", "factoring", "contrato mercantil"] },
  { key: "procesal", keywords: ["demanda", "apelación", "casación", "proceso judicial", "medida cautelar"] },
  { key: "internacional", keywords: ["corte interamericana", "tratado", "extradición", "derecho internacional"] },
  { key: "informatico", keywords: ["ciberseguridad", "protección de datos", "hábeas data", "delitos informáticos"] },
];

// ============================================================
// 🧩 Ruta principal → /api/ia/chat
// ============================================================

router.post("/chat", async (req, res) => {
  try {
    // ✅ Verificación temprana de entorno
    if (!process.env.OPENAI_API_KEY) {
      console.error(chalk.redBright("❌ Falta configurar OPENAI_API_KEY en el entorno del servidor."));
      return res.status(500).json({
        ok: false,
        error: "Falta configurar OPENAI_API_KEY en el entorno del servidor.",
      });
    }

    // 🧾 Desestructurar cuerpo de la solicitud
    const {
      prompt,
      usuarioId = "invitado",
      expedienteId = "default",
      modo = "general",
      materia = "general",
      idioma = "es",
    } = req.body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ ok: false, error: "Falta o es inválido el prompt en la solicitud." });
    }

    // ============================================================
    // 🧠 Detección automática de materia jurídica
    // ============================================================

    let materiaDetectada = materia;
    const texto = prompt.toLowerCase();
    for (const m of materias) {
      if (m.keywords.some((k) => texto.includes(k))) {
        materiaDetectada = m.key;
        break;
      }
    }

    // ============================================================
    // 🎯 System Prompt según el modo
    // ============================================================

    let systemPrompt = "Eres un asistente jurídico útil, empático y claro.";

    switch (modo) {
      case "juridico":
        systemPrompt = `Eres un abogado experto en derecho ${materiaDetectada}.
        Responde de manera profesional, basada en el Derecho peruano vigente, citando artículos del Código Civil, Constitución, doctrina y jurisprudencia relevante.`;
        break;

      case "investigacion":
        systemPrompt = `Eres un investigador jurídico académico.
        Ayuda a plantear hipótesis, variables, objetivos y marcos teóricos de investigaciones jurídicas.`;
        break;

      default:
        systemPrompt = `Eres LitisBot, asistente jurídico de BúhoLex.
        Brinda información general, consejos legales y orientación clara sin reemplazar la asesoría de un abogado.`;
        break;
    }

    // ============================================================
    // 💬 Construcción de contexto conversacional
    // ============================================================

    const historialPrevio = await obtenerHistorialUsuario(usuarioId, expedienteId);

    const messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio.flatMap((h) => [
        { role: "user", content: h.pregunta },
        { role: "assistant", content: h.respuesta },
      ]),
      { role: "user", content: prompt },
    ];

    console.log(chalk.cyanBright(`📨 [IA] Solicitando respuesta → modo:${modo} | materia:${materiaDetectada}`));

    // ============================================================
    // 🤖 Llamada a OpenAI (vía servicio)
    // ============================================================

    const respuesta = await callOpenAI(messages, {
      model: "gpt-4o-mini",
      max_tokens: 1200,
      temperature: modo === "juridico" ? 0.3 : 0.7,
    });

    // ============================================================
    // 💾 Guardar historial en memoria o base de datos
    // ============================================================

    await guardarHistorial(usuarioId, expedienteId, prompt, respuesta);

    console.log(chalk.greenBright(`✅ [IA] Respuesta generada correctamente (${respuesta.length} caracteres)`));

    // ============================================================
    // 📤 Enviar respuesta al cliente
    // ============================================================

    return res.json({
      ok: true,
      respuesta,
      modoDetectado: modo,
      materiaDetectada,
      idioma,
    });
  } catch (err) {
    console.error(chalk.redBright("❌ Error interno en /api/ia/chat:"), err.message);
    return res.status(500).json({
      ok: false,
      error: err.message || "Error interno del servicio de IA.",
    });
  }
});

// ============================================================
// 🧪 Ruta de prueba directa para OpenAI (debug opcional)
// ============================================================

router.get("/test", async (_req, res) => {
  try {
    console.log(chalk.yellow("🧠 Ejecutando prueba directa de OpenAI..."));
    const messages = [
      { role: "system", content: "Eres LitisBot, asistente jurídico de BúhoLex." },
      { role: "user", content: "Explícame brevemente qué es el Código Civil peruano." },
    ];

    const respuesta = await callOpenAI(messages, {
      model: "gpt-4o-mini",
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
