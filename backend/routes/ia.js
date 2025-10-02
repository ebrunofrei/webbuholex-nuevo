// backend/routes/ia.js
import express from "express";
import { callOpenAI } from "../services/openaiService.js";
import { obtenerHistorialUsuario, guardarHistorial } from "../services/memoryService.js";

const router = express.Router();

// 📌 Clasificación automática de materias jurídicas
const materias = [
  { key: "civil", keywords: ["contrato", "obligación", "propiedad", "arrendamiento"] },
  { key: "penal", keywords: ["delito", "acusación", "pena", "condena"] },
  { key: "laboral", keywords: ["trabajador", "empleador", "despido", "sindicato"] },
  { key: "constitucional", keywords: ["derechos fundamentales", "amparo", "hábeas corpus", "tribunal constitucional"] },
  { key: "administrativo", keywords: ["procedimiento administrativo", "silencio administrativo", "SBN", "OSCE"] },
  { key: "tributario", keywords: ["impuesto", "SUNAT", "tributo", "declaración jurada"] },
  { key: "comercial", keywords: ["sociedad anónima", "empresa", "accionista", "factoring"] },
  { key: "procesal", keywords: ["demanda", "apelación", "casación", "sentencia", "proceso judicial"] },
  { key: "internacional", keywords: ["corte interamericana", "tratado", "derecho internacional", "extradición"] },
  { key: "informatico", keywords: ["ciberseguridad", "protección de datos", "habeas data", "delitos informáticos"] },
];

// ============================
// POST /api/ia
// ============================
router.post("/", async (req, res) => {
  try {
    const {
      prompt,
      usuarioId = "invitado",
      expedienteId = "default",
      modo = "general", // general | juridico | investigacion
      materia = "general",
      idioma = "es",
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Falta el prompt en la solicitud" });
    }

    // Detectar materia automáticamente
    let materiaDetectada = materia;
    const texto = prompt.toLowerCase();
    for (const m of materias) {
      if (m.keywords.some((k) => texto.includes(k.toLowerCase()))) {
        materiaDetectada = m.key;
        break;
      }
    }

    // Construir systemPrompt según el modo
    let systemPrompt = "Eres un asistente útil y generalista.";
    if (modo === "juridico") {
      systemPrompt = `Eres un abogado experto en derecho ${materiaDetectada}.
      Responde siempre con fundamento jurídico, citando artículos de la ley peruana, doctrina y jurisprudencia relevante.`;
    } else if (modo === "investigacion") {
      systemPrompt = `Eres un investigador académico en derecho.
      Ayuda a plantear hipótesis, variables, objetivos y marcos teóricos para tesis o investigaciones jurídicas.`;
    }

    // Recuperar historial del usuario
    const historialPrevio = await obtenerHistorialUsuario(usuarioId, expedienteId);

    const messages = [
      { role: "system", content: systemPrompt },
      ...historialPrevio.map((h) => ({ role: "user", content: h.pregunta })),
      ...historialPrevio.map((h) => ({ role: "assistant", content: h.respuesta })),
      { role: "user", content: prompt },
    ];

    // Llamar a OpenAI con nuestro wrapper
    const { text: respuesta } = await callOpenAI(messages, {
      model: "gpt-4o-mini",
      max_tokens: 1200,
      temperature: modo === "juridico" ? 0.3 : 0.7,
    });

    // Guardar en historial
    await guardarHistorial(usuarioId, expedienteId, prompt, respuesta);

    console.log(`[IA] Usuario: ${usuarioId} → modo: ${modo}, materia: ${materiaDetectada}`);

    return res.json({
      ok: true,
      respuesta,
      modoDetectado: modo,
      materiaDetectada,
      idioma,
    });
  } catch (err) {
    console.error("❌ Error en /api/ia:", err);
    return res.status(500).json({ ok: false, error: err.message || "Error interno en IA" });
  }
});

export default router;
