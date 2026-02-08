// ============================================================================
// 🧠 OpenAI Service — Enterprise R3.1 (TOOLS SAFE, CANÓNICO)
// ----------------------------------------------------------------------------
// - NO instruye al modelo
// - NO interpreta lenguaje
// - SOPORTA tools / tool_calls
// - PRESERVA historial con tools
// - Devuelve payload OpenAI-style (choices, finish_reason, etc.)
// ============================================================================

import OpenAI from "openai";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ---------------------------------------------------------------------------
// 🔧 Load dotenv robustamente
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const CANDIDATES = [".env.local", ".env.development", ".env.production", ".env"];

let loadedEnv = null;
for (const f of CANDIDATES) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    loadedEnv = f;
    break;
  }
}
if (!loadedEnv) dotenv.config();

// ---------------------------------------------------------------------------
// 🔐 API KEY
// ---------------------------------------------------------------------------
let openai = null;
const key = process.env.OPENAI_API_KEY;

const isValidKey =
  typeof key === "string" && /^sk(-proj)?-[A-Za-z0-9_\-]+/.test(key);

if (!isValidKey) {
  console.warn(
    chalk.redBright(
      "⚠️ OPENAI_API_KEY faltante o inválida."
    )
  );
} else {
  openai = new OpenAI({ apiKey: key });
  console.log(
    chalk.greenBright(
      `✅ OpenAI inicializado (${loadedEnv ?? "process.env"})`
    )
  );
}

// ============================================================================
// 🧩 Sanitización SEGURA de mensajes (TOOLS SAFE)
// ============================================================================
function sanitizeMessages(messages) {
  return Array.isArray(messages) ? messages : [];
}

// ============================================================================
// 🚀 CHAT COMPLETION (TOOLS READY)
// ============================================================================
export async function callOpenAI(
  { messages, tools = [], tool_choice = "auto" },
  options = {}
) {
  if (!openai) {
    throw new Error("OpenAI client no inicializado");
  }

  if (!Array.isArray(messages)) {
    throw new Error("messages debe ser array");
  }

  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    max_completion_tokens = 800,
  } = options;

  const cleanMessages = sanitizeMessages(messages);

  const payload = {
    model,
    messages: cleanMessages,
    temperature,
    max_completion_tokens,
  };

  // 🔑 tools SOLO si existen
  if (Array.isArray(tools) && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = tool_choice;
  }

  try {
    console.log(
      chalk.cyanBright(
        `💬 OpenAI → ${model}, msgs=${cleanMessages.length}, tools=${tools.length}`
      )
    );

    const completion = await openai.chat.completions.create(payload);

    // Guard rail mínimo
    if (!completion || !Array.isArray(completion.choices)) {
      throw new Error("Respuesta OpenAI inválida (choices)");
    }

    return completion;
  } catch (err) {
    const status = err?.status ?? "NoStatus";
    const code = err?.code ?? "unknown";

    console.error(
      chalk.red(
        `❌ OpenAI error [${status} – ${code}]: ${err?.message || err}`
      )
    );

    throw err;
  }
}

// ============================================================================
// 🔄 STREAMING (TOOLS READY)
// ============================================================================
export async function callOpenAIStream(
  { messages, tools = [], tool_choice = "auto" },
  options = {},
  onDelta
) {
  if (!openai) throw new Error("OpenAI client no inicializado");

  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    max_completion_tokens = 800,
  } = options;

  const cleanMessages = sanitizeMessages(messages);

  const payload = {
    model,
    messages: cleanMessages,
    temperature,
    max_completion_tokens,
    stream: true,
  };

  if (tools.length) {
    payload.tools = tools;
    payload.tool_choice = tool_choice;
  }

  const stream = await openai.chat.completions.create(payload);

  for await (const part of stream) {
    const delta = part?.choices?.[0]?.delta;
    if (delta && onDelta) onDelta(delta);
  }
}

// ============================================================================
// Exporta cliente
// ============================================================================
export function getOpenAIClient() {
  if (!openai) throw new Error("OpenAI client no inicializado");
  return openai;
}
