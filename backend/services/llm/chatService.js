// ============================================================================
// 🦉 BúhoLex | chatService — ORQUESTADOR LLM PURO (CANÓNICO FINAL)
// ----------------------------------------------------------------------------
// RESPONSABILIDAD ÚNICA:
// - Armar mensajes
// - Llamar al LLM con tools
// - Normalizar la salida del modelo
//
// PROHIBIDO:
// - Lenguaje humano
// - Agenda
// - Mongo
// - Formatter
// - Heurística
// ============================================================================

import chalk from "chalk";
import { callOpenAI } from "../openaiService.js";

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

const safeString = (v) => (typeof v === "string" ? v.trim() : "");

function safeJSONParse(str) {
  if (!str || typeof str !== "string") return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function buildMessages({ systemPrompt, inlineSystem, history = [], userPrompt }) {
  const msgs = [];

  if (systemPrompt) {
    msgs.push({ role: "system", content: systemPrompt });
  }

  if (inlineSystem) {
    msgs.push({ role: "system", content: inlineSystem });
  }

  if (Array.isArray(history)) {
    for (const m of history) {
      if (
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      ) {
        msgs.push({ role: m.role, content: m.content });
      }
    }
  }

  msgs.push({ role: "user", content: userPrompt });

  return msgs;
}

// ---------------------------------------------------------------------------
// NORMALIZADOR CANÓNICO DE RESPUESTA LLM
// ---------------------------------------------------------------------------

function normalizeLLMResponse(raw, modelName) {
  const choice = raw?.choices?.[0];

  if (!choice) {
    return {
      kind: "message",
      text: "",
      meta: { error: "empty_choice", model: modelName },
    };
  }

  const { finish_reason, message } = choice;

  // ---------------------------------------------------------
  // TOOL CALL (ÚNICO CAMINO PARA ACCIONES)
  // ---------------------------------------------------------
  if (finish_reason === "tool_calls" && Array.isArray(message?.tool_calls)) {
    const call = message.tool_calls[0]; // 1 acción por turno

    const parsedArgs = safeJSONParse(call?.function?.arguments);

    return {
      kind: "action",
      action: {
        name: call?.function?.name || null,
        arguments: parsedArgs,
        rawArguments: call?.function?.arguments || null,
        valid: Boolean(parsedArgs),
      },
      meta: {
        model: modelName,
        finishReason: "tool_calls",
        parseError: !parsedArgs,
      },
    };
  }

  // ---------------------------------------------------------
  // RESPUESTA NORMAL (TEXTO)
  // ---------------------------------------------------------
  const text =
    typeof message?.content === "string"
      ? message.content.trim()
      : "";

  return {
    kind: "message",
    text,
    meta: {
      model: modelName,
      finishReason: finish_reason ?? "stop",
      empty: text.length === 0,
    },
  };
}

// ---------------------------------------------------------------------------
// API PRINCIPAL
// ---------------------------------------------------------------------------

export async function runChatLLM({
  prompt,
  history = [],
  systemPrompt = "",
  inlineSystem = "",
  tools = [],
  tool_choice = "auto",
  options = {},
}) {
  const userPrompt = safeString(prompt);

  if (!userPrompt) {
    return {
      kind: "message",
      text: "",
      meta: { emptyPrompt: true },
    };
  }

  const messages = buildMessages({
    systemPrompt,
    inlineSystem,
    history,
    userPrompt,
  });

  const modelName = options.model ?? "gpt-4o-mini";

  try {
    const raw = await callOpenAI(
      { messages, tools, tool_choice },
      {
        model: modelName,
        temperature: options.temperature ?? 0.7,
        max_completion_tokens: options.max_completion_tokens ?? 800,
      }
    );

    return normalizeLLMResponse(raw, modelName);

  } catch (err) {
    console.error(
      chalk.red("❌ chatService.runChatLLM"),
      err?.message || err
    );

    return {
      kind: "message",
      text: "",
      meta: { error: true },
    };
  }
}

export default runChatLLM;
