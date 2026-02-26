/**
 * JurisprudenceAlignment
 * - Usa tu embeddings + tu vector search (Pinecone)
 * - NO inventa jurisprudencia: solo alinea contra tu base real
 *
 * ⚠️ Ajusta el import de vectorSearch si tu ruta difiere tras el move.
 */
import { getEmbedding } from "../../../services/llm/embeddingService.js";
import { vectorSearch } from "../../../services/vectorStoreClient.js";

export async function getJurisprudenceAlignment({
  usuarioId,
  caseId = null,
  queryText,
  jurisdiction = "PE",
  topK = 5,
  minScore = 0.83,
} = {}) {
  const q = String(queryText || "").trim();
  if (!usuarioId || !q) return null;

  const emb = await getEmbedding(q);
  if (!emb) return null;

  // namespace sugerido (coherente con tu LTM)
  const namespace = caseId
    ? `litisbot__${usuarioId}__case_${caseId}__juris`
    : `litisbot__${usuarioId}__juris`;

  const matches = await vectorSearch(emb, topK, namespace);
  if (!Array.isArray(matches) || matches.length === 0) return null;

  // filtra por score mínimo
  const filtered = matches.filter((m) => (m?.score ?? 0) >= minScore);
  if (filtered.length === 0) {
    return { topK, bestScore: matches[0]?.score ?? 0, matches: [] };
  }

  const bestScore = filtered[0]?.score ?? 0;

  return {
    topK,
    bestScore,
    matches: filtered.map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata || {},
    })),
  };
}