import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbedding(text) {
  if (!text || !text.trim()) return null;

  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 4000),
  });

  return res.data[0].embedding;
}
