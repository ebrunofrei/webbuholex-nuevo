// ============================================================================
// 🧠 embeddingService.js — OpenAI Embeddings (R7.6++)
// Contrato explícito de dimensión
// ============================================================================

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔒 CONTRATO ÚNICO
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSION = 1536;

export async function getEmbedding(text) {
  if (!text || !text.trim()) return null;

  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 4000),
  });

  const embedding = res?.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `[EMBEDDING] Invalid dimension: ${embedding?.length} ≠ ${EMBEDDING_DIMENSION}`
    );
  }

  return embedding;
}
