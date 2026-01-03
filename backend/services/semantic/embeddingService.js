import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text) {
  if (!text || !text.trim()) return null;

  const r = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return r.data[0]?.embedding || null;
}
