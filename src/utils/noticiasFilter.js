// src/utils/noticiasFilter.js
// ============================================================
// 🦉 BúhoLex | Utilidades de filtrado/dedupe para Noticias
// - Bloqueo global de farándula/streaming/apuestas
// - SoftFilter por tema con requisitos "must" estrictos
// - Penalizaciones cruzadas fuertes
// - Dedupe por enlace/id/título
// ============================================================

// ------------------------ Normalización ------------------------
export const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

export const textOf = (n = {}) =>
  norm(`${n.titulo || n.title || ""} ${n.resumen || n.description || n.abstract || n.snippet || ""} ${n.fuente || n.source?.name || n.source || ""}`);

// ------------------------ Bloqueos globales --------------------
const GLOBAL_ENTERTAINMENT = [
  // farándula / concursos / celebs / moda
  "faramd", "faramdula", "farándula", "espectaculo", "espectáculo", "entretenim", "celebr", "celebridad",
  "miss", "certamen", "reina", "belleza", "model", "desfile", "alfombra roja", "premi", "novela", "reality", "televisa",
  "noviazgo", "romance", "pareja", "look", "vestido", "outfit", "moda", "glamour", "viral tiktok", "influenc",
];

export const ADS_BLOCK_PATTERNS = [
  // apuestas / streaming / deportes en vivo
  /\bapuesta(s)?\b/i, /\bcuota(s)?\b/i, /\bpron(ó|o)stico(s)?\b/i,
  /\bcasino\b/i, /\bbet\b/i, /\bstream(ing)?\b/i, /\ben vivo\b/i,
  /\bd(o|ó)nde ver\b/i, /\bver online\b/i, /\blive\b/i, /\blink del partido\b/i,
  /\bpartido\b/i, /\bjornada\b/i, /\balineaci(o|ó)n\b/i, /\bgol(es)?\b/i, /\bliga\b/i,
  /\bselecci(o|ó)n\b/i, /\bmundial\b/i, /\bchampions\b/i, /\bcopa\b/i,
];

const BLOCKED_SPORTS_DOMAINS = [
  "apuestatotal", "bet365", "betfair", "betsson", "doradobet",
  "onefootball", "marca.com", "as.com", "ole.com", "tycsports.com",
  "espn", "foxsports", "libero.pe", "depor.com"
];

export function isBlockedByDomain(n = {}) {
  const u = String(n.enlace || n.url || n.link || "");
  const host = (() => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; }})();
  return BLOCKED_SPORTS_DOMAINS.some((bad) => host.includes(bad));
}

function hitsAny(t, arr) {
  return arr.some((kw) => t.includes(norm(kw)));
}

export function isAdOrSportsPromo(t) { return ADS_BLOCK_PATTERNS.some((re) => re.test(t)); }
export function isEntertainment(t)   { return hitsAny(t, GLOBAL_ENTERTAINMENT); }

export function isProbablyAdDomain(u = "") {
  try {
    const h = new URL(u, location.origin).hostname.toLowerCase();
    const bad = [
      "doubleclick", "adservice", "taboola", "outbrain",
      "t.co", "bit.ly", "goo.gl", "tinyurl",
      "l.facebook.com", "lnkd.in", "wa.me"
    ];
    return bad.some(k => h.includes(k));
  } catch { return false; }
}

// --- Promos de producto / lifestyle (cosméticos, “dónde comprar”, reviews, etc.)
const PRODUCT_PROMO_WORDS = [
  "protector solar",
  "crema", "cosmético", "cosmetico",
  "maquillaje", "skin care", "skincare",
  "dónde comprar", "donde comprar",
  "cómo comprar", "como comprar",
  "en amazon", "oferta", "descuento",
  "review", "reseña",
  "mejores productos", "guía de compra", "guia de compra",
];

export function isProductPromo(text = "", fuente = "") {
  const t = (text || "").toLowerCase();
  const f = (fuente || "").toLowerCase();

  // Si el texto parece guía de compra / promo, bloquear
  if (PRODUCT_PROMO_WORDS.some(k => t.includes(k))) return true;

  // Fuentes/labs de lifestyle (si quieres ser más estricto, añade aquí dominios/secciones)
  if (/(glamour|vogue|hola)\b/.test(f)) return true;

  return false;
}

// ------------------------ Dedupe --------------------------------
export function keyOf(n = {}, i = 0) {
  return n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`;
}

export function dedupeByKey(arr = [], makeKey = keyOf) {
  const m = new Map();
  arr.forEach((it, i) => {
    const k = makeKey(it, i);
    if (!m.has(k)) m.set(k, it);
  });
  return Array.from(m.values());
}

// ------------------------ Reglas por tema -----------------------
const SOFT_FILTER_RULES = {
  politica: {
    must: ["gobiern","ministr","congres","president","decret","ley","partid","gabinet","pcm","pleno","reglament","minjus","mindef"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: ["corrup","soborn","coim","lavado","peculad","colusi"], // no mezclar con corrupción
  },
  corrupcion: {
    must: ["corrup","soborn","coim","lavado","colusi","peculad","investig","fiscal","procurad","contral","ocma","cohech","trafico de influencia","enriquec"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: [],
  },
  economia: {
    must: ["econom","inflac","dolar","dólar","precio","mercad","finanz","banco","sunat","pbi","inversion","bono","remuner","salari","emple","cts","igv","pbi"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: ["corrup","cohech","colusi","farand","entretenim"], // evitar contaminación
  },
  ciencia: {
    // palabras propias del ámbito científico/sanitario
    must: [
      "cienc","investig","estudi","paper","revista","peer review","ensayo","laborat","experim",
      "univers","academ","hospital","clin","salud","medic","bio","genet","neuro","farmac","vacun","publicacion","nature","science","lancet"
    ],
    stop: ["apuesta","deport","stream","en vivo"],
    // Filtro duro anti-farándula en CIENCIA
    hardBlock: ["miss","certamen","reina","belleza","modelo","moda","alfombra roja","celebr","espectaculo","espectáculo","entretenim","reality"],
    crossPenalty: ["farand","entretenim","celebr","moda"],
  },
  tecnologia: {
    must: ["tecnolog","inteligen","ia ","ciber","softw","aplic","app","dato","movil","móvil","robot","chip","algoritm","plataform","cloud","dev","codigo","código"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: ["farand","entretenim"],
  },
  sociedad: {
    must: ["socie","educa","colegi","cultur","famili","comun","psicol","social","transporte","viviend","municip","colectivo"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: [],
  },
  internacional: {
    must: ["mundo","internacion","geopolit","onu","ue","oea","frontera","embajad","guerra","conflic","naciones unidas","otan","union europea","canciller"],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: [],
  },
  actualidad: {
    must: [],
    stop: ["apuesta","deport","stream","en vivo"],
    crossPenalty: [],
  },
};

// ------------------------ SoftFilter por tema -------------------
export function softFilter(items = [], temaSlug = "actualidad") {
  const rules = SOFT_FILTER_RULES[temaSlug] || SOFT_FILTER_RULES.actualidad;
  if (!rules) return items;

  // 1) Bloqueo global (ads/stream/deportes + dominios + farándula genérica)
  const firstPass = items.filter((n) => {
    const t = textOf(n);
    if (isAdOrSportsPromo(t)) return false;
    if (isEntertainment(t))   return false;
    if (isBlockedByDomain(n)) return false;
    return true;
  });

  // 2) Corta de raíz farándula en CIENCIA
  const secondPass = (temaSlug === "ciencia" && rules.hardBlock)
    ? firstPass.filter((n) => !hitsAny(textOf(n), rules.hardBlock))
    : firstPass;

  // 3) Scoring por must/stop/crossPenalty
  const scored = secondPass.map((n) => {
    const t = textOf(n);
    const mustHits = (rules.must || []).reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
    const stopHits = (rules.stop || []).reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
    const crossHits = (rules.crossPenalty || []).reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);
    const score = mustHits * 3 - stopHits * 2 - crossHits * 4; // más exigente
    return { n, mustHits, score };
  }).sort((a, b) => b.score - a.score);

  // 4) Criterio de aceptación
  let filtered;
  if (temaSlug === "actualidad") {
    filtered = scored.filter((x) => x.score >= 0).map((x) => x.n);
  } else {
    filtered = scored.filter((x) => x.mustHits >= 1 && x.score >= 0).map((x) => x.n);
    if (filtered.length < 3) filtered = scored.filter((x) => x.mustHits >= 1).map((x) => x.n);
    if (filtered.length < 2) filtered = secondPass;
  }

  return dedupeByKey(filtered);
}

// Alias útil si tu código todavía invoca filterByTema
export const filterByTema = (arr = [], tema = "") => softFilter(arr, norm(tema || "actualidad"));
