// ============================================================================
// 🧠 vectorStoreClient.js — Pinecone Connector (R7.6++)
// Infraestructura pura · Fail-fast · Dimensión explícita
// ============================================================================

import { Pinecone } from "@pinecone-database/pinecone";
import { EMBEDDING_DIMENSION } from "../../services/llm/embeddingService.js";

// ===================== ENV ==========================
const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX;

if (!apiKey || !indexName) {
  throw new Error("❌ Pinecone mal configurado (API KEY / INDEX)");
}

// ===================== CLIENTE ======================
export const pinecone = new Pinecone({ apiKey });

// ===================== ÍNDICE =======================
export function getIndex() {
  return pinecone.index(indexName);
}

// ===================== VALIDACIÓN ===================
function isValidEmbedding(vec) {
  return Array.isArray(vec) && vec.length === EMBEDDING_DIMENSION;
}

// ===================== SEARCH =======================
export async function vectorSearch(
  queryEmbedding,
  topK = 3,
  namespace = "global"
) {
  if (!isValidEmbedding(queryEmbedding)) return [];

  try {
    const index = getIndex();

    const result = await index.query(
      {
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      },
      { namespace }
    );

    return result?.matches || [];
  } catch (err) {
    console.warn("[LTM] vectorSearch disabled:", err.message);
    return [];
  }
}

// ===================== UPSERT =======================
export async function vectorUpsert({
  id,
  embedding,
  metadata = {},
  namespace = "global",
}) {
  if (!id || !isValidEmbedding(embedding)) return false;

  try {
    const index = getIndex();

    await index.upsert(
      [
        {
          id,
          values: embedding,
          metadata,
        },
      ],
      { namespace }
    );

    return true;
  } catch (err) {
    console.warn("[LTM] vectorUpsert failed:", err.message);
    return false;
  }
}

export default {
  getIndex,
  vectorSearch,
  vectorUpsert,
};
