// backend/services/openaiService.js
// ============================================================
// 🧠 Servicio OpenAI – robusto a orden de imports (.env bootstrap)
// ============================================================

import OpenAI from "openai";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ---------- Carga .env local (independiente de server.js) ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// raíz del proyecto: /backend/services/.. -> sube dos niveles
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
if (!loadedEnv) dotenv.config(); // fallback

// -------------------------------------------------------------------
let openai = null;

// Acepta `sk-` y `sk-proj-`
const key = process.env.OPENAI_API_KEY;
const isValidKey = typeof key === "string" && /^sk(-proj)?-[A-Za-z0-9_\-]+/.test(key);

if (!isValidKey) {
  console.warn(
    chalk.redBright(
      "⚠️ OPENAI_API_KEY ausente o con formato inválido.\n" +
      "   Asegúrate de que comience con 'sk-' o 'sk-proj-'."
    )
  );
} else {
  openai = new OpenAI({ apiKey: key });
  console.log(
    chalk.greenBright(
      `✅ OpenAI listo (env: ${loadedEnv ?? "process.env"} · key: ${key.slice(0, 8)}… )`
    )
  );
}

/**
 * Llama a OpenAI y devuelve el string de la respuesta.
 * @param {Array<{role:string, content:string}>} messages
 * @param {{model?:string, temperature?:number, max_tokens?:number}} options
 * @returns {Promise<string>}
 */
export async function callOpenAI(messages, options = {}) {
  if (!openai) {
    console.error(chalk.redBright("❌ No se puede llamar a OpenAI: API Key no configurada."));
    return "⚠️ El sistema no puede procesar la consulta en este momento (configuración de IA).";
  }

  const {
    model = "gpt-4o-mini",
    temperature = 0.7,
    max_completion_tokens = 800,
  } = options;

  try {
    console.log(chalk.cyanBright(`💬 OpenAI → modelo: ${model}`));

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_completion_tokens,
    });

    const respuesta =
      completion?.choices?.[0]?.message?.content?.trim() ?? "";

    console.log(chalk.greenBright(`🧩 Respuesta IA (${respuesta.length} chars)`));
    return respuesta;

  } catch (err) {
    console.error(
      chalk.red(
        `❌ Error OpenAI: ${err?.status ?? ""} ${err?.code ?? ""} – ${err?.message ?? err}`
      )
    );
    return "❌ No pude obtener respuesta de la IA. Inténtalo de nuevo.";
  }
}

