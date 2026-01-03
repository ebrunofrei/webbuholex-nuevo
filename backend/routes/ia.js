// ============================================================================
// 🦉 BÚHOLEX | Ruta IA Unificada (Enterprise Edition 2025) — CANÓNICA FINAL
// ----------------------------------------------------------------------------
// PRINCIPIOS (INVIOLABLES):
// 1) LLM FIRST: el LLM es el único intérprete del lenguaje.
// 2) Agenda = widget operativo (ejecuta acciones, NO dialoga).
// 3) Mensajería humana SOLO la genera el LLM.
// 4) Memoria canónica = ChatMessage (1 caso = 1 sessionId).
// 5) Este archivo NO vuelve a tocarse.
// ============================================================================

import express from "express";
import chalk from "chalk";
import mongoose from "mongoose";

import { runChatLLM } from "../services/llm/chatService.js";
import { handleAgenda } from "../services/agenda/responder.js";
import { loadHistory, saveTurn } from "../services/llm/historyService.js";
import { buildLLMContext } from "../services/llm/promptBuilder.js";
import { trimMessages } from "../services/llm/historyUtils.js";
import { normalizarRespuestaWord } from "../services/llm/outputNormalizer.js";

import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();
const IS_PROD = process.env.NODE_ENV === "production";

// ============================================================================
// UTILIDADES DEFENSIVAS
// ============================================================================

const safeStr = (v, max = 8000) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const safeId = (v, fb = null) =>
  typeof v === "string" && v.trim() ? v.trim() : fb;

const logDev = (tag, obj) => {
  if (!IS_PROD) console.log(chalk.cyanBright(tag), obj);
};

// ============================================================================
// POST /api/ia/chat
// ============================================================================

router.post("/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY faltante",
      });
    }

    const body = req.body || {};
    const prompt = safeStr(body.prompt);

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Prompt vacío",
      });
    }

    const usuarioId = safeId(body.usuarioId, "invitado");
    const caseId = safeId(body.caseId, null);
    const tz = body.userTimeZone || "America/Lima";

    // =========================================================================
    // 1️⃣ HISTORIAL + CONTEXTO (CANÓNICO A3)
    // =========================================================================

    let historialPrevio = [];

    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
      historialPrevio = await loadHistory({
        caseId,
        usuarioId,
        limit: 20,
      });
    }

    const llmCtx = await buildLLMContext({
      prompt,
      body,
      usuarioId,
      caseId,
    });

    const messages = trimMessages(
      [
        { role: "system", content: llmCtx.systemPromptFinal },
        ...historialPrevio,
        { role: "user", content: prompt },
      ],
      18_000
    );

    logDev("[IA CONTEXT]", {
      usuarioId,
      caseId,
      mensajes: messages.length,
    });

    // ============================================================
    // 2️⃣ EJECUCIÓN LLM (CANÓNICA, NO VACÍA)
    // ============================================================

    const llmResult = await runChatLLM({
      prompt,
      history: historialPrevio || [],
      systemPrompt: llmCtx.systemPromptFinal,
      options: {
        temperature: llmCtx.temperature,
      },
    });

    let respuestaFinal =
      typeof llmResult?.reply === "string" && llmResult.reply.trim()
        ? normalizarRespuestaWord(llmResult.reply)
        : null;

    // 🔒 GARANTÍA ABSOLUTA: el router NUNCA devuelve vacío
    if (!respuestaFinal) {
      console.warn("⚠️ LLM devolvió respuesta vacía. Inyectando fallback.");
      respuestaFinal =
        "Continúa. Estoy siguiendo tu planteamiento y puedo desarrollarlo.";
    }

    let agendaMeta = null;

    // ============================================================
    // 3️⃣ EJECUCIÓN DE ACCIONES (AGENDA, SOLO SI EXISTE)
    // ============================================================

    if (llmResult?.action?.type === "AGENDA") {
      const agendaResult = await handleAgenda({
        action: llmResult.action,
        usuarioId,
        expedienteId,
        userTimeZone: tz,
      });

      agendaMeta = agendaResult?.meta || null;

      if (agendaResult?.reply) {
        respuestaFinal = agendaResult.reply;
      }
    }
    // =========================================================================
    // 4️⃣ PERSISTENCIA (ORDENADA, CANÓNICA)
    // =========================================================================

    // 4.1 Histórico técnico (auditoría / analytics)
    await saveTurn({
      usuarioId,
      caseId: caseId && mongoose.Types.ObjectId.isValid(caseId) ? caseId : null,
      prompt,
      reply: respuestaFinal,
      meta: { agendaMeta },
    });

    // 4.2 Memoria conversacional REAL (ChatMessage)
    if (caseId && mongoose.Types.ObjectId.isValid(caseId)) {
      const sessionId = `case_${caseId}`;

      await ChatMessage.insertMany([
        {
          usuarioId,
          caseId,
          sessionId,
          role: "user",
          content: prompt,
        },
        {
          usuarioId,
          caseId,
          sessionId,
          role: "assistant",
          content: respuestaFinal,
          meta: agendaMeta ? { agendaMeta } : {},
        },
      ]);
    }

    // =========================================================================
    // 5️⃣ RESPUESTA
    // =========================================================================

    return res.json({
      ok: true,
      respuesta: respuestaFinal,
      reply: respuestaFinal,
      meta: {
        agendaHandled: Boolean(agendaMeta),
      },
    });

  } catch (err) {
    console.error("❌ IA CHAT:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Error interno IA",
    });
  }
});

export default router;
