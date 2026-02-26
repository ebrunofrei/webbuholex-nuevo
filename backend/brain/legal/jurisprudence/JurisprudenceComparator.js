// ============================================================================
// ⚖️ JurisprudenceComparator — Comparativo real con jurisprudencia (R7.7++)
// ----------------------------------------------------------------------------
// - Usa embeddings + Pinecone
// - Devuelve "evidence pack" (título, corte, año, extracto)
// - No genera conclusión jurídica por sí solo: solo referencias
// ============================================================================

import { getEmbedding } from "../../../services/llm/embeddingService.js";
import { vectorSearch } from "../../../services/vector/vectorStoreClient.js";

export async function compareWithJurisprudence(
  text,
  {
    namespace = "jurisprudencia_pe",
    topK = 5,
    minScore = 0.78,
  } = {}
) {
  const embedding = await getEmbedding(String(text || ""));
  if (!embedding) return { matches: [], note: "Embedding no disponible." };

  const matches = await vectorSearch(embedding, topK, namespace);

  const filtered = (matches || [])
    .filter((m) => (m?.score ?? 0) >= minScore)
    .map((m) => ({
      id: m.id,
      similarity: Number((m.score ?? 0).toFixed(3)),
      title: m.metadata?.title || m.metadata?.titulo || "Referencia jurisprudencial",
      court: m.metadata?.court || m.metadata?.sede || null,
      year: m.metadata?.year || m.metadata?.anio || null,
      source: m.metadata?.source || m.metadata?.fuente || null,
      extract: pickExtract(m.metadata),
      url: m.metadata?.url || null,
    }));

  return {
    matches: filtered,
    note: filtered.length
      ? "Coincidencias encontradas en base vectorial."
      : "Sin coincidencias relevantes (bajo umbral).",
  };
}

function pickExtract(meta = {}) {
  const s =
    meta.summary ||
    meta.resumen ||
    meta.extract ||
    meta.fragment ||
    meta.text ||
    "";
  return String(s).slice(0, 620);
}