// ============================================================================
// 🧠 LongTermMemory — Pinecone R7.6++
// LTM auxiliar · Nunca rompe el turno
// ============================================================================

import { getEmbedding } from "../../services/llm/embeddingService.js";
import { vectorSearch } from "../../services/vector/vectorStoreClient.js";

const SCORE_THRESHOLD = 0.83;

// -----------------------------------------------------------
// STORE
// -----------------------------------------------------------
export async function longTermMemoryStore({
  usuarioId,
  caseId = null,
  text,
  tags = [],
}) {
  if (!usuarioId || !text || text.length < 160) return false;

  try {
    const embedding = await getEmbedding(text);
    if (!embedding || embedding.length !== EMBEDDING_DIMENSION) return false;

    const namespace = caseId
      ? `litisbot__${usuarioId}__case_${caseId}`
      : `litisbot__${usuarioId}`;

    const id = `mem_${Date.now()}`;

    return await vectorUpsert({
      id,
      embedding,
      namespace,
      metadata: {
        usuarioId,
        caseId,
        text,
        tags,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[LTM] store aborted:", err.message);
    return false;
  }
}

// -----------------------------------------------------------
// RECALL
// -----------------------------------------------------------
export async function longTermMemoryRecall({
  usuarioId,
  caseId = null,
  userQuery,
  currentTags = [],
}) {
  if (!usuarioId || !userQuery) return null;

  try {
    const queryEmbedding = await getEmbedding(userQuery);
    if (!queryEmbedding || queryEmbedding.length !== EMBEDDING_DIMENSION)
      return null;

    const namespace = caseId
      ? `litisbot__${usuarioId}__case_${caseId}`
      : `litisbot__${usuarioId}`;

    const matches = await vectorSearch(queryEmbedding, 3, namespace);
    if (!matches.length) return null;

    const best = matches[0];
    if (best.score < SCORE_THRESHOLD) return null;

    const mergedTags = [
      ...new Set([...(best.metadata?.tags || []), ...currentTags]),
    ];

    return {
      isOldCase: true,
      relevanceScore: best.score,
      historicalText: best.metadata?.text,
      mergedTags,
    };
  } catch (err) {
    console.warn("[LTM] recall aborted:", err.message);
    return null;
  }
}
