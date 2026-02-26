// ============================================================================
// ⚠️ ContradictionDetector — Contradicciones internas (heurístico + embedding)
// ----------------------------------------------------------------------------
// - Backend-first
// - No reescribe
// - Devuelve hallazgos puntuales con evidencias
// - Opcional: embeddings para detectar “misma idea con signo opuesto”
// ============================================================================

import { splitSentences, normalizeText } from "../text/textHelpers.js";
import { getEmbedding } from "../../../services/llm/embeddingService.js";

// Palabras de polaridad jurídica (muy simplificadas, pero efectivas)
const POSITIVE = ["fundada", "procedente", "acoge", "se declara", "corresponde"];
const NEGATIVE = ["infundada", "improcedente", "rechaza", "se deniega", "no corresponde", "inadmisible"];

export async function detectInternalContradictions(raw = "", opts = {}) {
  const text = String(raw || "");
  const sentences = splitSentences(text);

  if (sentences.length < 3) {
    return {
      contradictions: [],
      score: 100,
      notes: ["Insuficientes oraciones para análisis de contradicción."],
    };
  }

  // 1) Heurístico: misma entidad + polaridad opuesta en ventanas cercanas
  const heuristic = detectHeuristicContradictions(sentences);

  // 2) Embedding (opcional): ideas muy similares con polaridad opuesta
  let embeddingContradictions = [];
  if (opts.useEmbeddings) {
    embeddingContradictions = await detectEmbeddingContradictions(sentences, {
      minCosine: opts.minCosine ?? 0.90,
      maxPairs: opts.maxPairs ?? 16,
    });
  }

  const merged = [...heuristic, ...embeddingContradictions]
    .slice(0, opts.maxFindings ?? 8);

  // Score: penaliza hallazgos
  const score = Math.max(0, 100 - merged.length * 18);

  return {
    contradictions: merged,
    score,
    notes: merged.length
      ? ["Se detectaron posibles tensiones internas; revisar consistencia factual y decisoria."]
      : ["No se detectan contradicciones obvias."],
  };
}

function detectHeuristicContradictions(sentences) {
  const out = [];

  for (let i = 0; i < sentences.length; i++) {
    const a = sentences[i];
    const aPol = polarity(a);

    if (aPol === 0) continue;

    // comparar con siguientes 6 oraciones
    for (let j = i + 1; j < Math.min(sentences.length, i + 7); j++) {
      const b = sentences[j];
      const bPol = polarity(b);
      if (bPol === 0) continue;

      // polaridad opuesta
      if (aPol + bPol !== 0) continue;

      // simple “mismo tema”: comparten 3+ palabras relevantes
      if (!shareRelevantTokens(a, b)) continue;

      out.push({
        type: "heuristic_polarity_conflict",
        evidence: { a, b, aIndex: i, bIndex: j },
        hint:
          "Dos enunciados cercanos parecen afirmar conclusiones opuestas sobre el mismo punto. Verificar si se trata de excepción, subsidiariedad o error.",
      });
    }
  }

  return out;
}

function polarity(sentence) {
  const s = normalizeText(sentence).toLowerCase();

  const pos = POSITIVE.some((w) => s.includes(w));
  const neg = NEGATIVE.some((w) => s.includes(w));

  if (pos && !neg) return +1;
  if (neg && !pos) return -1;
  return 0;
}

function shareRelevantTokens(a, b) {
  const ta = tokenizeRelevant(a);
  const tb = tokenizeRelevant(b);
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common >= 3;
}

function tokenizeRelevant(s) {
  const stop = new Set(["el","la","los","las","de","del","y","o","que","en","por","para","con","sin","un","una","se","es","al"]);
  return new Set(
    normalizeText(s)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(" ")
      .filter((w) => w.length > 4 && !stop.has(w))
      .slice(0, 28)
  );
}

async function detectEmbeddingContradictions(sentences, cfg) {
  const pairs = [];

  // Limitar costo
  const slice = sentences.slice(0, 40);

  const embeddings = await Promise.all(
    slice.map(async (s) => {
      try {
        const e = await getEmbedding(s);
        return e || null;
      } catch {
        return null;
      }
    })
  );

  for (let i = 0; i < slice.length; i++) {
    if (!embeddings[i]) continue;

    const pi = polarity(slice[i]);
    if (pi === 0) continue;

    for (let j = i + 1; j < slice.length; j++) {
      if (!embeddings[j]) continue;

      const pj = polarity(slice[j]);
      if (pj === 0) continue;

      // solo buscamos polaridad opuesta
      if (pi + pj !== 0) continue;

      const cos = cosine(embeddings[i], embeddings[j]);
      if (cos < cfg.minCosine) continue;

      pairs.push({
        type: "embedding_semantic_conflict",
        evidence: { a: slice[i], b: slice[j], similarity: Number(cos.toFixed(3)) },
        hint:
          "Dos oraciones muy similares semánticamente parecen tener polaridad jurídica opuesta. Revisar consistencia o matiz (subsidiariedad/excepción).",
      });

      if (pairs.length >= cfg.maxPairs) return pairs;
    }
  }

  return pairs;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const den = Math.sqrt(na) * Math.sqrt(nb);
  return den ? dot / den : 0;
}