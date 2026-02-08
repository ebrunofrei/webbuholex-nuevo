// backend/services/tools/normalizeLegalText.js
import { getOpenAIClient } from "../openaiService.js";

const PROMPTS_BY_MODE = {
  audiencia: {
    system: `
You are a professional courtroom interpreter.
Rewrite the text using formal oral courtroom language.
Address the court respectfully (e.g., "Your Honor").
Maintain first-person if appropriate.
Be natural and concise.
    `.trim(),
  },

  pericial: {
    system: `
You are drafting a forensic expert report.

Rewrite the text in an impersonal, technical, and objective register.

STRICT RULES:
- Do NOT address the judge or the court.
- Do NOT use first person ("I", "we").
- Prefer passive voice.
- Sound suitable for an expert report.
- Preserve legal meaning exactly.
    `.trim(),
  },

  legal: {
    system: `
You are a legal translation assistant.
Rewrite the text in neutral, formal legal language.
Do not exaggerate or add content.
    `.trim(),
  },
};

export async function normalizeLegalText({ text, mode = "legal" }) {
  if (!text) return "";

  const openai = getOpenAIClient();

  const promptConfig = PROMPTS_BY_MODE[mode] || PROMPTS_BY_MODE.legal;

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: promptConfig.system },
      { role: "user", content: text },
    ],
  });

  return res?.choices?.[0]?.message?.content?.trim() || text;
}
