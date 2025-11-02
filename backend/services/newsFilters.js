// backend/services/newsFilters.js (o colócalo en routes/noticias.js)
const PROVIDER_ALIASES = {
  // normaliza etiquetas que llegan distintas
  "science daily": "sciencedaily",
  "scienceDaily": "sciencedaily",
  "sci encedaily": "sciencedaily",
  "el país": "elpais",
  "elcomercio.pe": "elcomercio",
  "rpp noticias": "rpp",
};

function normSlug(s = "") {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim();
}

function normProviderName(n) {
  const slug = normSlug(n);
  return PROVIDER_ALIASES[slug] || slug;
}

// detector rápido (ligero, sin dependencias)
function detectLangQuick(text = "") {
  const T = String(text || "").toLowerCase();
  if (!T.trim()) return "unknown";
  const es = (T.match(/[áéíóúñ¡¿]| el | la | de | que | los | las | para | con | del /g) || []).length;
  const en = (T.match(/ the | of | and | to | in | is | for | on | with | by /g) || []).length;
  if (es === 0 && en === 0) return "unknown";
  return es >= en ? "es" : "en";
}

function filterByProviders(items = [], allow = []) {
  if (!allow || allow.length === 0) return items;
  const allowSet = new Set(allow.map(normProviderName));
  return items.filter((n) => {
    const prov = normProviderName(n.proveedor || n.fuente || n.source || "");
    return allowSet.has(prov);
  });
}

function filterByLang(items = [], lang) {
  if (!lang || lang === "all") return items;
  return items.filter((n) => {
    const explicit = (n.lang || n.idioma || "").toLowerCase();
    if (explicit) return explicit.startsWith(lang);
    const text = `${n.titulo || ""} ${n.resumen || ""}`;
    return detectLangQuick(text) === lang;
  });
}

function sortByMediaThenDate(arr = []) {
  const mediaScore = (n) => {
    const hasVideo = !!(n.video || n.videoUrl || (n.media && /video/i.test(n.media)));
    if (hasVideo) return 2;
    if (n.imagen) return 1;
    return 0;
  };
  return [...arr].sort((a, b) => {
    const ms = mediaScore(b) - mediaScore(a);
    if (ms) return ms;
    const da = new Date(a.fecha || a.pubDate || a.date || 0).getTime();
    const db = new Date(b.fecha || b.pubDate || b.date || 0).getTime();
    if (db !== da) return db - da;
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}

module.exports = {
  normProviderName,
  filterByProviders,
  filterByLang,
  sortByMediaThenDate,
};
