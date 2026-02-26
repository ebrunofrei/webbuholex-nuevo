// JurisprudenceComparator.js
// ============================================================================
// ⚖️ JurisprudenceComparator — Comparador (CANÓNICO)
// ----------------------------------------------------------------------------
// - NO UI
// - NO inventa fuentes
// - Requiere un provider: searchSimilar({query, jurisdiction, limit})
// - Devuelve resultados listos para mostrar.
// ============================================================================

export function createJurisprudenceComparator(provider) {
  if (!provider || typeof provider.searchSimilar !== "function") {
    throw new Error("JurisprudenceComparator: provider.searchSimilar requerido");
  }

  return {
    async compare({ claims = [], jurisdiction = null, limit = 5 }) {
      const topClaims = (claims || []).slice(0, 6);
      if (topClaims.length === 0) return { matches: [], note: "Sin claims para comparar." };

      // Query compacta (no saturar)
      const query = topClaims
        .map((c) => String(c).slice(0, 220))
        .join(" | ")
        .slice(0, 900);

      const matches = await provider.searchSimilar({ query, jurisdiction, limit });

      return {
        matches: Array.isArray(matches) ? matches : [],
      };
    },
  };
}