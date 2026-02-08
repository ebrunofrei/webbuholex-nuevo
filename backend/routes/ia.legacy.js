// ============================================================================
// 🦉 BÚHOLEX | Ruta IA Unificada — CANÓNICA R4.1 (2026)
// ----------------------------------------------------------------------------
// - Reset REAL de contexto con turnContext.analysisReset
// - Historial limpio (sin duplicados, sin drift)
// - Memoria a largo plazo (LTM) integrada sin interferir con CORTO plazo
// - Tools con retry obligatorio y tool_choice determinístico
// - Persistencia única vía saveTurn()
// ============================================================================

import express from "express";
import chalk from "chalk";
import mongoose from "mongoose";

import { runChatLLM } from "../services/llm/chatService.js";
import { handleAgenda } from "../services/agenda/responder.js";

import { loadHistory, saveTurn } from "../services/llm/historyService.js";
import { buildLLMContext } from "../services/llm/LLMContextEngine.js";
import { formatLLMResponse } from "../services/llm/responseFormatter.js";

import { resolveTurnContext } from "../brain/TurnContextResolver.js";

// 🔥 Memoria de largo plazo
import {
  longTermMemoryRecall,
  longTermMemoryStore,
} from "../brain/LTM/LongTermMemory.js";

const router = express.Router();

// ============================================================================
// HELPERS
// ============================================================================
const safeStr = (v, max = 8000) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const safeId = (v, fb = null) =>
  typeof v === "string" && v.trim() ? v.trim() : fb;

const resolveSessionId = (caseId) =>
  caseId && mongoose.Types.ObjectId.isValid(caseId)
    ? `case_${caseId}`
    : null;

// ============================================================================
// TOOL PICKER
// ============================================================================
function pickAgendaToolName(userPrompt = "") {
  const t = String(userPrompt || "").toLowerCase();
  const looksLikeQuery =
    /\b(consulta|consultar|ver|listar|mostrar|revisar|disponibilidad|disponible|próxim|agenda|calendario)\b/i.test(
      t
    );
  return looksLikeQuery ? "agenda_query" : "agenda_create";
}

const agendaCreateTool = {
  type: "function",
  function: {
    name: "agenda_create",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        startISO: { type: "string" },
        endISO: { type: "string" },
        notes: { type: ["string", "null"] },
        telefono: { type: ["string", "null"] },
        alertaWhatsapp: { type: "boolean" },
      },
      required: ["title", "startISO", "endISO"],
    },
  },
};

const agendaQueryTool = {
  type: "function",
  function: {
    name: "agenda_query",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        start: { type: "string" },
        end: { type: "string" },
      },
      required: ["start", "end"],
    },
  },
};

// ============================================================================
// POST /api/ia/chat
// ============================================================================
router.post("/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const prompt = safeStr(body.prompt);

    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Prompt vacío" });
    }

    // -----------------------------------------------------------------------
    // 0️⃣ RESOLVER TURNO + TAGS + ACCIÓN DE CONTEXTO
    // -----------------------------------------------------------------------
    const previousTurnContext = body.previousTurnContext || null;

    const turnContext = resolveTurnContext({
      userMessage: prompt,
      previousTurnContext,
    });

    const usuarioId = safeId(body.usuarioId, "invitado");
    const caseId = safeId(body.caseId, null);
    const sessionId = resolveSessionId(caseId);
    const tz = body.userTimeZone || "America/Lima";

    // -----------------------------------------------------------------------
    // 🔥 MEMORIA DE LARGO PLAZO (ANTES DE buildLLMContext)
    // -----------------------------------------------------------------------
    const ltmRecall = await longTermMemoryRecall({
      usuarioId,
      caseId,
      userQuery: prompt,
      currentTags: turnContext.tags || [],
    });

    // -----------------------------------------------------------------------
    // 1️⃣ HISTORIAL (RESET REAL)
    // -----------------------------------------------------------------------
    const history =
      turnContext?.analysisReset
        ? []
        : sessionId
        ? await loadHistory({
            usuarioId,
            expedienteId: caseId,
            limit: 25,
            turnContext,
          })
        : [];

    // -----------------------------------------------------------------------
    // 2️⃣ ARMAR CONTEXTO PARA LLM
    // -----------------------------------------------------------------------
    const llmCtx = await buildLLMContext({
      prompt,
      body,
      usuarioId,
      caseId,
      turnContext,
      longTermMemory: ltmRecall, // << INYECTAMOS MEMORIA DE LARGO PLAZO
    });

    const forceTool = Boolean(llmCtx?.actionsMeta?.forceTool);
    const forcedToolName = forceTool ? pickAgendaToolName(prompt) : null;

    // -----------------------------------------------------------------------
    // 3️⃣ PRIMERA PASADA DEL MODELO
    // -----------------------------------------------------------------------
    const first = await runChatLLM({
      prompt,
      history,
      systemPrompt: llmCtx.systemPromptFinal,
      tools: [agendaCreateTool, agendaQueryTool],
      tool_choice: "auto",
      options: { temperature: llmCtx.temperature },
    });

    let finalLLM = first;

    // -----------------------------------------------------------------------
    // 4️⃣ RETRY OBLIGATORIO SI NO SE LLAMÓ A LA TOOL
    // -----------------------------------------------------------------------
    if (forceTool && first.kind !== "action") {
      const retry = await runChatLLM({
        prompt,
        history,
        systemPrompt:
          llmCtx.systemPromptFinal +
          "\n\nREGLA: si el usuario quiere agendar, debes llamar herramienta.",
        tools: [agendaCreateTool, agendaQueryTool],
        tool_choice: { type: "function", function: forcedToolName },
        options: { temperature: 0.1 },
      });

      finalLLM = retry;

      if (retry.kind !== "action") {
        finalLLM = {
          ...retry,
          text:
            retry.text ||
            "Para agendar necesito que confirmes fecha, hora exacta y zona horaria.",
        };
      }
    }

    // -----------------------------------------------------------------------
    // 5️⃣ EJECUCIÓN DE TOOL Y SEGUNDA PASADA
    // -----------------------------------------------------------------------
    const didCallTool = finalLLM.kind === "action";

    if (didCallTool) {
      const { name, arguments: args } = finalLLM.action;
      let toolPayload = null;

      if (name === "agenda_create") {
        toolPayload = await handleAgenda({
          action: { type: "CREATE_FROM_DRAFT", draft: args },
          usuarioId,
          expedienteId: caseId,
          userTimeZone: tz,
        });
      }

      if (name === "agenda_query") {
        toolPayload = await handleAgenda({
          action: { type: "QUERY", query: args },
          usuarioId,
          expedienteId: caseId,
          userTimeZone: tz,
        });
      }

      finalLLM = await runChatLLM({
        prompt,
        history: [
          ...history,
          { role: "assistant", content: "" },
          {
            role: "tool",
            name,
            content: JSON.stringify(toolPayload || {}),
          },
        ],
        systemPrompt: llmCtx.systemPromptFinal,
        options: { temperature: 0.3 },
      });
    }

    // -----------------------------------------------------------------------
    // 6️⃣ FORMATEO PASIVO
    // -----------------------------------------------------------------------
    const finalText = formatLLMResponse({
      reply: finalLLM.text || "",
      agendaFlag: didCallTool ? 1 : 0,
      userPrompt: prompt,
      meta: finalLLM.meta || {},
    });

    // -----------------------------------------------------------------------
    // 🔥 7️⃣ GUARDAR EN MEMORIA LARGA (SOLO SI ES SUSTANCIAL)
    // -----------------------------------------------------------------------
    if (finalText.length > 160) {
      await longTermMemoryStore({
        usuarioId,
        caseId,
        text: finalText,
        tags: turnContext.tags || [],
      });
    }

    // -----------------------------------------------------------------------
    // 8️⃣ PERSISTENCIA ÚNICA (SHORT MEMORY)
    // -----------------------------------------------------------------------
    await saveTurn({
      usuarioId,
      caseId,
      expedienteId: caseId,
      prompt,
      reply: finalText,
      meta: {
        ...(finalLLM.meta || {}),
        turnContext, // << CRÍTICO PARA RESET INMEDIATO
      },
    });

    // -----------------------------------------------------------------------
    // 9️⃣ RESPUESTA FINAL
    // -----------------------------------------------------------------------
    return res.json({
      ok: true,
      reply: finalText,
      turnContext,
      meta: finalLLM.meta,
    });
  } catch (err) {
    console.error(chalk.red("❌ IA CHAT"), err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Error interno IA",
    });
  }
});

export default router;
