import { Router } from "express";
import { callOpenAI } from "../services/openaiService.js";
import { obtenerHistorialUsuario, guardarHistorial } from "../services/memoryService.js";
import { buscarFuentesLegales } from "../services/fuenteLegalService.js";

const router = Router();

router.post("/", async (req, res) => {
  const { consulta, usuarioId, expedienteId, modo, pro, fuentesOficiales, fuentesEncontradas } = req.body;

  // --- 1. Memoria: trae historial de usuario ---
  let historial = [];
  try {
    historial = await obtenerHistorialUsuario(usuarioId, expedienteId);
  } catch (error) {
    console.warn("No se pudo obtener historial:", error.message);
  }

  // --- 2. Fuentes legales ---
  let fuentes = fuentesEncontradas;
  if (!fuentes || !fuentes.length) {
    try {
      fuentes = await buscarFuentesLegales(consulta);
    } catch (error) {
      console.warn("No se pudieron buscar fuentes legales:", error.message);
      fuentes = [];
    }
  }

  // --- 3. Construye prompt para IA ---
  let messages = [
    {
      role: "system",
      content: modo === "legal"
        ? "Eres LitisBot A1, asistente legal peruano especializado. Solo responde con fundamento jurídico real, cita doctrina, jurisprudencia y normas PERUANAS. Da links a las fuentes cuando existan. Nunca inventes normas o jurisprudencia. Si no sabes, responde con humildad."
        : "Eres LitisBot, un asistente legal general que ayuda con modelos, dudas rápidas y consejos prácticos. No inventes leyes, responde solo con temas legales generales."
    }
  ];

  // Memoria/historial breve (máximo 2 mensajes)
  historial.slice(0, 2).forEach(msg => {
    messages.push({ role: "user", content: msg.pregunta });
    messages.push({ role: "assistant", content: msg.respuesta });
  });

  // Incluye fuentes encontradas en el prompt
  if (fuentes && fuentes.length) {
    messages.push({
      role: "system",
      content: "Fuentes oficiales encontradas para la consulta:\n" +
        fuentes.map(f => `- ${f.titulo}: ${f.url} (${f.fuente})`).join("\n")
    });
  }

  // Consulta del usuario
  messages.push({ role: "user", content: consulta });

  // --- 4. Llama a OpenAI (o tu IA) ---
  const respuesta = await callOpenAI(messages);

  // --- 5. Guarda en memoria/historial ---
  try {
    await guardarHistorial(usuarioId, expedienteId, consulta, respuesta);
  } catch (error) {
    console.warn("No se pudo guardar historial:", error.message);
  }

  res.json({ respuesta });
});

export default router;
