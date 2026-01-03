// ============================================================================
// 🦉 BúhoLex | chatService — Orquestador IA CANÓNICO (A3)
// ----------------------------------------------------------------------------
// - NO genera lenguaje humano
// - NO interpreta intención
// - NO corrige al LLM
// - SOLO orquesta y garantiza retorno
// ============================================================================

import chalk from "chalk";
import { callOpenAI } from "../openaiService.js";

// ---------------------------------------------------------------------------
// Utilidades internas (NO cognitivas)
// ---------------------------------------------------------------------------

const safeString = (v) =>
  typeof v === "string" ? v.trim() : "";

function buildMessages({ system, history = [], userPrompt }) {
  const msgs = [];

  if (system) {
    msgs.push({ role: "system", content: system });
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
// API principal (LLM FIRST REAL)
// ---------------------------------------------------------------------------

export async function runChatLLM({
  prompt,
  history = [],
  systemPrompt = "",
  options = {},
}) {
  const userPrompt = safeString(prompt);

  // 🔒 Validación mínima (NO lenguaje humano)
  if (!userPrompt) {
    return {
      reply: "",
      meta: { emptyPrompt: true },
    };
  }

  const messages = buildMessages({
    system: systemPrompt,
    history,
    userPrompt,
  });

  try {
    const raw = await callOpenAI(messages, {
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.7,
      max_completion_tokens: options.max_completion_tokens ?? 800,
    });

    const reply =
      typeof raw === "string"
        ? raw.trim()
        : raw?.reply || raw?.content || "";

    return {
      reply,
      meta: {
        model: options.model ?? "gpt-4o-mini",
        empty: reply.length === 0,
      },
    };

  } catch (err) {
    console.error(
      chalk.red("❌ chatService.runChatLLM"),
      err?.message ?? err
    );

    return {
      reply: "",
      meta: { error: true },
    };
  }
}
