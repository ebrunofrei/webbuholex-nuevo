import { db, auth, storage } from "#services/myFirebaseAdmin.js";
import { Router } from "express";
import { callOpenAI } from "#services/openaiService.js";
import { obtenerHistorialUsuario, guardarHistorial } from "#services/memoryService.js";
import { buscarFuentesLegales } from "#services/fuenteLegalService.js";

const router = Router();

/**
 * 📌 Endpoint principal de LitisBot
 * Body esperado:
 * {
 *   consulta: string,
 *   usuarioId: string,
 *   expedienteId?: string,
 *   modo?: "legal" | "general",
 *   pro?: boolean,
 *   fuentesOficiales?: boolean,
 *   fuentesEncontradas?: array
 * }
 */
router.post("/", async (req, res) => {
  const {
    consulta,
    usuarioId = "anonimo",
    expedienteId = null,
    modo = "legal",
    pro = false,
    fuentesOficiales = true,
    fuentesEncontradas = [],
  } = req.body || {};

  // --- Validación de entrada ---
  if (!consulta || consulta.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: "La consulta es demasiado corta o inválida.",
    });
  }

  // --- 1. Memoria: trae historial del usuario ---
  let historial = [];
  try {
    historial = await obtenerHistorialUsuario(usuarioId, expedienteId);
  } catch (error) {
    console.warn("⚠️ No se pudo obtener historial:", error.message);
  }

  // --- 2. Fuentes legales ---
  let fuentes = fuentesEncontradas;
  if ((!fuentes || !fuentes.length) && fuentesOficiales) {
    try {
      fuentes = await buscarFuentesLegales(consulta);
    } catch (error) {
      console.warn("⚠️ No se pudieron buscar fuentes legales:", error.message);
      fuentes = [];
    }
  }

  // --- 3. Construye mensajes para IA ---
  const messages = [
    {
      role: "system",
      content:
        modo === "legal"
          ? "Eres LitisBot A1, asistente legal peruano especializado. Responde solo con fundamento jurídico real. Cita doctrina, jurisprudencia y normas PERUANAS cuando corresponda. Incluye links a fuentes oficiales si existen. Nunca inventes información. Si no sabes, responde con humildad."
          : "Eres LitisBot, un asistente legal general que ayuda con modelos, dudas rápidas y consejos prácticos. No inventes leyes ni jurisprudencia.",
    },
  ];

  // Contexto de memoria (máx 2 turnos anteriores)
  historial.slice(0, 2).forEach((msg) => {
    messages.push({ role: "user", content: msg.pregunta });
    messages.push({ role: "assistant", content: msg.respuesta });
  });

  // Agrega fuentes legales encontradas
  if (fuentes && fuentes.length) {
    messages.push({
      role: "system",
      content:
        "Fuentes oficiales encontradas para la consulta:\n" +
        fuentes
          .map((f) => `- ${f.titulo}: ${f.url} (${f.fuente})`)
          .join("\n"),
    });
  }

  // Mensaje del usuario
  messages.push({ role: "user", content: consulta });

  // --- 4. Llama a OpenAI ---
  let respuesta = "";
  try {
    respuesta = await callOpenAI(messages);
  } catch (error) {
    console.error("❌ Error al llamar a OpenAI:", error.message);
    return res.status(502).json({
      success: false,
      error: "Error al procesar la respuesta con IA.",
    });
  }

  // --- 5. Guarda en historial ---
  try {
    await guardarHistorial(usuarioId, expedienteId, consulta, respuesta);
  } catch (error) {
    console.warn("⚠️ No se pudo guardar historial:", error.message);
  }

  // --- 6. Respuesta final ---
  return res.json({
    success: true,
    respuesta,
    fuentes,
  });
});

export default router;
