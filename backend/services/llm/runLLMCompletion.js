// ============================================================================
// 🧠 runLLMCompletion
// ----------------------------------------------------------------------------
// Single execution gateway to the LLM provider.
// - No cognition
// - No UX
// - No intent detection
// - No channel logic
//
// Responsibility:
// - Execute completion with provided prompts
// - Apply safe defaults per channel
// - Return plain text output
// ============================================================================

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --------------------------------------------------
// Channel-level execution presets
// --------------------------------------------------
function getChannelConfig(channel) {
  switch (channel) {
    case "pro_chat":
      return {
        model: "gpt-4.1",
        temperature: 0.2,
        max_tokens: 2000,
      };

    case "bubble_chat":
      return {
        model: "gpt-4.1-mini",
        temperature: 0.3,
        max_tokens: 1200,
      };

    default:
      return {
        model: "gpt-4.1-mini",
        temperature: 0.3,
        max_tokens: 1000,
      };
  }
}

// --------------------------------------------------
// Main execution
// --------------------------------------------------
export async function runLLMCompletion({
  systemPrompt,
  userPrompt,
  channel = "bubble_chat",
}) {
  if (!systemPrompt || !userPrompt) {
    throw new Error("Missing systemPrompt or userPrompt");
  }

  const config = getChannelConfig(channel);

  const response = await client.chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response?.choices?.[0]?.message?.content?.trim() || "";
}

export default runLLMCompletion;
