// ======================================================================
// 🧠 semanticCaseSearch
// ----------------------------------------------------------------------
// - Búsqueda semántica por CASO
// - Usa MongoDB Atlas Vector Search
// - NO lógica de IA
// ======================================================================

import ChatMessage from "../../models/ChatMessage.js";

export async function semanticCaseSearch({
  caseId,
  embedding,
  limit = 8,
}) {
  if (!caseId || !Array.isArray(embedding)) return [];

  const pipeline = [
    {
      $vectorSearch: {
        index: "case_semantic",
        path: "embedding",
        queryVector: embedding,
        filter: { caseId },
        numCandidates: 100,
        limit,
      },
    },
    {
      $project: {
        _id: 1,
        role: 1,
        content: 1,
        score: { $meta: "vectorSearchScore" },
        createdAt: 1,
      },
    },
  ];

  return ChatMessage.aggregate(pipeline);
}
