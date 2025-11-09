// ============================================================
// 🦉 BúhoLex | Filtros de noticias (anti-ads + clasificación)
// - Sin \\p{...} (compatible con TS/JS estándar)
// - Bloqueo por copy y por dominios de apuestas/stream
// - Soft filter por tema y dedupe
// ============================================================

// Normaliza: lower + quita acentos (NFD + rango Unicode de diacríticos)
export const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const textOf = (n = {}) =>
  norm(
    `${n.titulo || n.title || ""} ${
      n.resumen || n.description || n.abstract || n.snippet || ""
    }`
  );

// -------- 1) Palabras/expresiones a bloquear (ads/streaming deportivo)
const ADS_BLOCK_PATTERNS = [
  /\bapuesta(s)?\b/i,
  /\bcuota(s)?\b/i,
  /\bpron[óo]stico(s)?\b/i,
  /\bcasino\b/i,
  /\bbet\b/i,
  /\bbono\b/i,
  /\bpromo\b/i,
  /\bstream(ing)?\b/i,
  /\ben vivo\b/i,
  /\bver online\b/i,
  /\btransmisi[oó]n\b/i,
  /\blink del partido\b/i,
  /\bd[oó]nde ver\b/i,
  /\bfixture\b/i,
  /\bpartido\b.*\b(ver|online|en vivo)\b/i,
];

// -------- 2) Lista negra de dominios (apuestas/streaming/link-shorteners)
const DOMAIN_BLACKLIST = [
  // Apuestas (Perú/LatAm + globales comunes)
  "apuestatotal.com",
  "inkabet.pe",
  "inkabet.com",
  "solbet.com",
  "doradobet.com",
  "teapuesto.pe",
  "betsson.com",
  "rivalo.com",
  "bwin.com",
  "1xbet.com",
  "bet365.com",
  "codere.com",
  "marathonbet.com",
  "leovegas.com",
  "888sport.com",
  // Streaming deportivo/no oficial
  "rojadirecta",
  "tarjetaroja",
  "pirlotv",
  "futbolparatodos",
  "librefutbol",
  "telerium",
  "tvnest",
  "socolive",
  "crackstreams",
  // Shorteners usados en promos
  "bit.ly",
  "linktr.ee",
  "tinyurl.com",
  "shorte.st",
];

// Host de una URL (vacío si no es URL válida)
function hostOf(url = "") {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// ¿Host coincide (exacto/subdominio/contiene) con lista negra?
function isBlackDomain(host = "") {
  if (!host) return false;
  const h = host.replace(/^www\./, "");
  return DOMAIN_BLACKLIST.some(
    (bad) => h === bad || h.endsWith(`.${bad}`) || h.includes(bad)
  );
}

// Bloqueo por dominio en enlace/imagen/fuenteUrl (si tu backend la adjunta)
export function isBlockedByDomain(n = {}) {
  const linkHost = hostOf(n.enlace || n.url || n.link || "");
  const imageHost = hostOf(n.imagen || n.image || n.urlToImage || "");
  const sourceHost = hostOf(n.fuenteUrl || "");
  return (
    isBlackDomain(linkHost) || isBlackDomain(imageHost) || isBlackDomain(sourceHost)
  );
}

// Bloqueo por texto (ads/streaming)
export function isAdOrSportsPromo(textNormalized = "") {
  return ADS_BLOCK_PATTERNS.some((re) => re.test(textNormalized));
}

// -------- 3) Soft filter por tema (separa política/corrupción)
const SOFT_FILTER_RULES = {
  politica: {
    must: [
      "gobiern",
      "ministr",
      "congres",
      "president",
      "decret",
      "ley",
      "partid",
      "gabinet",
      "pcm",
      "minjus",
      "mindef",
    ],
    stop: [
      "corrup",
      "soborn",
      "coim",
      "lavado",
      "colusi",
      "peculad",
      "apuesta",
      "deport",
      "futbol",
      "fútbol",
      "stream",
      "vivo",
    ],
  },
  corrupcion: {
    must: [
      "corrup",
      "soborn",
      "coim",
      "lavado",
      "colusi",
      "peculad",
      "investig",
      "fiscal",
      "procurad",
      "contral",
      "ocma",
      "cohech",
      "trafico de influencia",
      "enriquec",
    ],
    stop: ["apuesta", "deport", "futbol", "fútbol", "stream", "vivo"],
  },
  economia: {
    must: ["econom", "inflac", "dolar", "dólar", "precio", "mercad", "finanz", "banco", "sunat", "pbi"],
    stop: ["futbol", "fútbol", "deport", "gol", "liga", "apuesta", "stream"],
  },
  ciencia: {
    must: ["cienc", "investig", "salud", "descubr", "estudi", "univers", "hospital", "medic"],
    stop: ["apuesta", "deport", "stream"],
  },
  tecnologia: {
    must: ["tecnolog", "inteligen", "ciber", "softw", "app", "dato", "movi", "móvi", "robot", "chip", " ia "],
    stop: ["apuesta", "deport", "stream"],
  },
  sociedad: {
    must: ["socie", "educa", "cultur", "famili", "comun", "psicol", "social"],
    stop: ["apuesta", "deport", "stream"],
  },
  actualidad: { must: [], stop: ["apuesta", "deport", "stream"] },
};

export function softFilter(items = [], temaSlug = "actualidad") {
  const rules = SOFT_FILTER_RULES[temaSlug] || SOFT_FILTER_RULES.actualidad;

  // 1) fuera publicidad por texto
  const noAds = items.filter((n) => !isAdOrSportsPromo(textOf(n)));

  // 2) fuera por dominios de apuesta/stream
  const noAdsDomain = noAds.filter((n) => !isBlockedByDomain(n));

  if (!rules) return noAdsDomain;

  // 3) puntuar por tema
  const scored = noAdsDomain
    .map((n) => {
      const t = textOf(n);
      const mustHits = (rules.must || []).reduce(
        (acc, kw) => acc + (t.includes(kw) ? 1 : 0),
        0
      );
      const stopHits = (rules.stop || []).reduce(
        (acc, kw) => acc + (t.includes(kw) ? 1 : 0),
        0
      );
      const penalty =
        temaSlug === "politica" && /corrup|soborn|lavado|peculad|colusi/.test(t) ? 2 : 0;
      return { n, score: mustHits - stopHits - penalty };
    })
    .sort((a, b) => b.score - a.score);

  let filtered = scored.filter((x) => x.score >= 0).map((x) => x.n);
  if (filtered.length < 3) filtered = noAdsDomain; // relajar si queda muy poco
  return filtered;
}

// -------- Dedupe simple por id/enlace
export function keyOf(n, i = 0) {
  return (
    n.enlace ||
    n.url ||
    n.link ||
    n.id ||
    n._id ||
    `${n.titulo || n.title || "item"}#${i}`
  );
}

export function dedupeByKey(arr = []) {
  const m = new Map();
  arr.forEach((it, i) => {
    const k = keyOf(it, i);
    if (!m.has(k)) m.set(k, it);
  });
  return Array.from(m.values());
}
