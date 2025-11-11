// backend/services/research/index.js
import { fetchBing } from "./providers/bing.js";
import { fetchGoogleCSE } from "./providers/googleCSE.js";
import { fetchSerpApi } from "./providers/serpapi.js";
import { normalizeHit, filterAllowedDomains } from "./normalize.js";

const MAX = Number(process.env.RESEARCH_MAX_RESULTS || 6);
const ALLOWED = (process.env.RESEARCH_ALLOWED_DOMAINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PROVIDERS = [
  { name: "bing",       fn: fetchBing,       active: !!process.env.BING_API_KEY },
  { name: "googleCSE",  fn: fetchGoogleCSE,  active: !!(process.env.GOOGLE_CSE_ID && process.env.GOOGLE_API_KEY) },
  { name: "serpapi",    fn: fetchSerpApi,    active: !!process.env.SERPAPI_KEY },
];

const TIPO_HINTS = {
  norma: ["site:elperuano.pe", "site:gob.pe", "ley", "decreto", "resolución"],
  jurisprudencia: ["site:pj.gob.pe", "casación", "sentencia", "expediente"],
  precedente: ["precedente", "vinculante", "TC", "site:tc.gob.pe"],
  doctrina: ["doctrina", "revista", "scielo", "pdf", "artículo"],
  general: [],
};

// ✅ SALUD (para /api/research/health)
export function researchHealth() {
  const active = PROVIDERS.find((p) => p.active) || null;
  return {
    enabled: !!active,
    provider: active?.name || null,
    max: MAX,
    allowed: ALLOWED,
  };
}

// ✅ BUSCADOR (para /api/research/search)
export async function researchSearch({ q, tipo = "general" }) {
  const hints = TIPO_HINTS[tipo] || [];
  const boosted = [q, ...hints].join(" ");

  const provider = PROVIDERS.find((p) => p.active);
  if (!provider) return [];

  const raw = await provider.fn({ q: boosted, max: MAX * 2 });
  const norm = raw.map(normalizeHit).filter(Boolean);
  const safe = filterAllowedDomains(norm, ALLOWED);

  // dedupe por URL + tope MAX
  const seen = new Set();
  const out = [];
  for (const r of safe) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
    if (out.length >= MAX) break;
  }
  return out;
}
