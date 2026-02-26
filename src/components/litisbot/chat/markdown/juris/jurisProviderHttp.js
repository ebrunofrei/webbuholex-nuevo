// jurisProviderHttp.js
// ============================================================================
// 🔌 HTTP Provider (CANÓNICO)
// - Conecta a backend de jurisprudencia cuando exista.
// - Mantener contrato estable.
// ============================================================================

export function createHttpJurisProvider({ endpoint = "/api/juris/search" } = {}) {
  return {
    async searchSimilar({ query, jurisdiction = null, limit = 5 }) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, jurisdiction, limit }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) return [];
      return data.matches || [];
    },
  };
}