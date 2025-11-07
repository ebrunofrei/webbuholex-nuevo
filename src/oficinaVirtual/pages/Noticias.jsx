// src/oficinaVirtual/pages/Noticias.jsx
/* ============================================================
 * 🦉 BÚHOLEX | Noticias Jurídicas Inteligentes (Oficina Virtual)
 * - Jurídicas: providers oficiales + fallback progresivo + keywords por especialidad
 * - Generales: por tema (chips) con softFilter y anti-ads (prudente deportes/farándula)
 * - Imagen robusta con proxy + OG + favicon + fallback
 * - Responsive móvil/tablet/desktop
 * - CERO publicidad: bloqueo por patrones y dominios
 * ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReaderModal from "@/components/ui/ReaderModal";
import {
  API_BASE,
  getNoticiasRobust,
  getEspecialidades,
  getTemas,
  clearNoticiasCache,
} from "@/services/noticiasClientService.js";

// 🔒 Filtros de contenido (anti-ads, softFilter, dedupe, helpers)
import {
  softFilter as _softFilterMaybe, // puede no existir; abajo hago fallback
  dedupeByKey,
  textOf,
  isAdOrSportsPromo,
  isBlockedByDomain,
  norm,
} from "@/utils/noticiasFilter.js";

/* ----------------------- Constantes ----------------------- */
const PAGE_SIZE = 12;
const EXTENDED_LIMIT = 50; // lote para "Ver más"
const FALLBACK_IMG = "/assets/img/noticia_fallback.png";
const MAX_AGE_DAYS = 2;

const DEBUG_NEWS =
  (import.meta?.env?.VITE_DEBUG_NEWS ?? "true").toString() !== "false";

// ⛔ Chips a ocultar siempre (por ahora)
const PERMA_HIDE = new Set([
  "seguridad social",
  "consumidor",
  "penitenciario",
  "registral",
  "familiar",
  "procesal",
]);

const ULTIMATE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <rect width="100%" height="100%" fill="#f6f2ee"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="18" fill="#a0674f" font-family="system-ui,Segoe UI,Roboto">
        BúhoLex · imagen no disponible
      </text>
    </svg>`
  );

/* ----------------------- Fecha ----------------------- */
const isFresh = (dateLike) => {
  if (!dateLike) return false;
  const d = new Date(dateLike);
  if (Number.isNaN(+d)) return false;
  return Date.now() - d.getTime() <= MAX_AGE_DAYS * 86400000;
};
const sortByDateDesc = (a, b) =>
  (b?.fecha ? new Date(b.fecha).getTime() : 0) -
  (a?.fecha ? new Date(a.fecha).getTime() : 0);

/* ----------------------- Chips/UX ----------------------- */
const CHIPS_JURIDICAS_FALLBACK = [
  "todas",
  "penal",
  "civil",
  "laboral",
  "constitucional",
  "familiar",
  "administrativo",
  "comercial",
  "tributario",
  "procesal",
  "registral",
  "ambiental",
  "notarial",
  "penitenciario",
  "consumidor",
  "seguridad social",
];
const CHIPS_GENERALES_FALLBACK = [
  "todas",
  "política",
  "economía",
  "sociedad",
  "ciencia",
  "tecnología",
  "corrupción",
  "internacional",
];

const OTRAS = [
  "comercial",
  "tributario",
  "procesal",
  "registral",
  "ambiental",
  "notarial",
  "penitenciario",
  "consumidor",
  "seguridad social",
];

/* Alias robusto */
const ALIAS = {
  tc: "constitucional",
  "tribunal constitucional": "constitucional",
  tribunalconst: "constitucional",
  proceso: "procesal",
  procedimiento: "procesal",
  regstral: "registral",
  registrales: "registral",
  registral: "registral",
  seguridadsocial: "seguridad social",
  "derechos humanos": "constitucional",
  internacional: "constitucional",
  administrativa: "administrativo",
  laborales: "laboral",
  civiles: "civil",
  penales: "penal",
  comerciales: "comercial",
  tributaria: "tributario",
  notariales: "notarial",
  ambientales: "ambiental",
  penitenciaria: "penitenciario",
  consumidoras: "consumidor",
};
const mapAlias = (s) => ALIAS[norm(s)] || norm(s);

const CHIP_PRIORITY = [
  "todas",
  "penal",
  "civil",
  "laboral",
  "constitucional",
  "familiar",
  "administrativo",
  "comercial",
  "tributario",
  "procesal",
  "registral",
  "ambiental",
  "notarial",
  "penitenciario",
  "consumidor",
  "seguridad social",
];
const sortChips = (arr) => {
  const idx = (v) => CHIP_PRIORITY.indexOf(v);
  return [...arr].filter(Boolean).sort((a, b) => {
    const ia = idx(a),
      ib = idx(b);
    if (ia !== -1 || ib !== -1)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b, "es");
  });
};
const pretty = (s) => {
  const m = String(s || "").toLowerCase();
  if (m === "tc") return "TC";
  if (m === "seguridad social") return "Seguridad social";
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const chipClass = (active) =>
  `px-3 py-1.5 rounded-full border text-sm font-semibold shrink-0 transition
   ${
     active
       ? "bg-[#b03a1a] text-white border-[#b03a1a] shadow-[0_2px_10px_rgba(176,58,26,.25)]"
       : "text-[#4a2e23] border-[#e7d4c8] bg-white hover:bg-[#fff2ea]"
   }`;

/* ----------------------- Imagen / Proxy ----------------------- */
const PROVIDER_LOGOS = {
  "legis.pe": "/assets/providers/legispe.png",
  "poder judicial": "/assets/providers/poder-judicial.png",
  "tribunal constitucional": "/assets/providers/tc.png",
  tc: "/assets/providers/tc.png",
  "el país": "/assets/providers/elpais.png",
  rpp: "/assets/providers/rpp.png",
};
const isExternal = (u) => /^https?:\/\//i.test(u);
const slug = (s) => (s || "").toString().trim().toLowerCase();

function absolutize(u, enlace) {
  const raw = (u ?? "").toString().trim();
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  try {
    if (isExternal(raw)) return raw;
    if (raw.startsWith("/")) {
      if (enlace && /^https?:\/\//i.test(enlace)) return new URL(raw, enlace).href;
      return raw;
    }
    if (enlace && /^https?:\/\//i.test(enlace)) return new URL(raw, enlace).href;
    return raw;
  } catch {
    return raw;
  }
}
function normalizeUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s) return "";
  return s.replace(/\s+/g, "");
}
function proxyUrl(absUrl) {
  const url = normalizeUrl(absUrl);
  if (!url) return "";
  if (isExternal(url))
    return `${API_BASE.replace(/\/+$/, "")}/media/proxy?url=${encodeURIComponent(
      url
    )}`;
  return url;
}
function resolveCardImage(n = {}) {
  const enlace = n.enlace || n.url || n.link || "";
  if (n.imagenResuelta) {
    const u = absolutize(n.imagenResuelta, enlace);
    if (/^https?:\/\//i.test(u)) return { src: proxyUrl(u), raw: u };
    return { src: u, raw: "" };
  }
  const fuente = slug(n.fuente || n.source);
  if (fuente && PROVIDER_LOGOS[fuente]) return { src: PROVIDER_LOGOS[fuente], raw: "" };

  const mediaCandidates = [
    n.imagen,
    n.image,
    n.imageUrl,
    n.urlToImage,
    n.thumbnail,
    n.thumbnailUrl,
    n?.enclosure?.url,
    n?.enclosure?.link,
    Array.isArray(n.multimedia) && n.multimedia[0]?.url,
    Array.isArray(n.media) && (n.media[0]?.url || n.media[0]?.src),
    Array.isArray(n.images) && n.images[0]?.url,
  ].filter(Boolean);

  for (const cand of mediaCandidates) {
    const abs = absolutize(cand, enlace);
    const clean = normalizeUrl(abs);
    if (!clean) continue;
    if (/^https?:\/\//i.test(clean)) return { src: proxyUrl(clean), raw: clean };
    return { src: clean, raw: "" };
  }

  if (enlace) {
    const ogEndpoint = `${API_BASE.replace(/\/+$/, "")}/media/og?url=${encodeURIComponent(
      enlace
    )}`;
    return { src: ogEndpoint, raw: "" };
  }
  return { src: FALLBACK_IMG, raw: "" };
}
const prioritizeLegis = (list = []) => {
  const isLegis = (n) => /legis\.pe/i.test(n?.fuente || n?.source || "");
  const a = [], b = [];
  for (const it of list) (isLegis(it) ? a : b).push(it);
  return [...a, ...b];
};

/* ----------------------- Keywords por especialidad ----------------------- */
const ES_KEYWORDS = {
  penal: ["penal","delito","fiscal","ministerio público","mp","juzgado penal","pena","acusación","imputado"],
  civil: ["civil","propiedad","contrato","obligaciones","daños y perjuicios","prescripción adquisitiva","posesión"],
  laboral: ["laboral","trabajador","sunafil","sindicato","cts","remuneración","desnaturalización","hostigamiento"],
  constitucional: ["constitucional","tribunal constitucional","tc","derechos humanos","amparo","hábeas corpus","amparo laboral"],
  familiar: ["familia","alimentos","tenencia","filiación","violencia familiar","régimen de visitas"],
  administrativo: ["administrativo","resolución","procedimiento administrativo","expediente","tupa","sancionador"],
  comercial: ["comercial","societario","empresa","constitución de empresa","indecopi","quiebra","concurso"],
  tributario: ["tributario","sunat","impuesto","igv","renta","fiscalización","reclamación tributaria"],
  procesal: ["procesal","proceso","procedimiento","tutela","cautelar","apelación","casación"],
  registral: ["registral","sunarp","registro","partida registral","título","inmatriculación","rectificación de partida"],
  ambiental: ["ambiental","oefa","mina","impacto ambiental","eia","pasivos ambientales"],
  notarial: ["notarial","notario","escritura pública","legalización de firmas","acta notarial"],
  penitenciario: ["penitenciario","inpe","cárcel","prisión","redención de pena","beneficios penitenciarios"],
  consumidor: ["consumidor","indecopi","protección al consumidor","cláusulas abusivas","idoneidad"],
  "seguridad social": ["seguridad social","essalud","onp","afp","pensión","jubilación","cálculo de pensión","devengo","resolución de pensiones"],
};

/* ----------------------- Clasificación por tema (Generales) ----------------------- */
const TOPIC_KEYWORDS = {
  actualidad: [],
  política: ["congreso","presidente","ministro","partido","gobierno","elecciones","voto","parlamento","decreto","ley"],
  economía: ["economía","inflación","bcr","pbi","mercado","subsidio","remuneración","dólar","exportación","importación"],
  sociedad: ["colegios","universidad","seguridad ciudadana","comunidad","transporte público","vecinos","municipalidad"],
  ciencia: ["ciencia","investigación","universidad","experimento","descubrimiento","astronomía","biotecnología","neurociencia","publicación científica"],
  tecnología: ["tecnología","software","hardware","intel","nvidia","microsoft","google","meta","openai","ciberseguridad","inteligencia artificial","ia","robot","chip"],
  corrupción: ["corrupción","cohecho","soborno","colusión","lavado de activos","contraloría","investigación fiscal"],
  internacional: ["onu","unión europea","guerra","conflicto","embajada","diplomático","frontera","israel","ucrania","estados unidos"],
};

// Canon: slug sin acentos -> etiqueta con acentos
const THEMES_CANON = {
  politica: "política",
  economia: "economía",
  tecnologia: "tecnología",
  corrupcion: "corrupción",
  sociedad: "sociedad",
  internacional: "internacional",
  ciencia: "ciencia",          // ✅ agregado
  actualidad: "actualidad",
};
function resolveTemaKeys(t) {
  const raw = String(t || "actualidad").trim().toLowerCase();
  const key = norm(raw);
  const canon = THEMES_CANON[key] || "actualidad";
  return { key, canon };
}

/* ----------------------- Anti-ruido prudente ----------------------- */
function isFarandulaOrSports(text = "") {
  const s = text.toLowerCase();

  // Farándula / Influencers
  const celeb = ["farándula","farandula","reality","tiktok","instagramer","youtuber","miss universo","miss world","certamen de belleza"];
  if (celeb.some((k) => s.includes(k))) return true;

  // Deportes (evitar "partido" político como falso positivo)
  const sports = [
    "champions","mundial","gol","tenis","nba","liga 1","premier league","bundesliga",
    "copa libertadores","copa sudamericana","selección peruana","seleccion peruana","fútbol","futbol"
  ];
  if (sports.some((k) => s.includes(k))) return true;

  // Transmisiones solo si claramente deportivas
  if ((s.includes("en vivo") || s.includes("transmisión") || s.includes("vivo vía")) &&
      (s.includes("fútbol") || s.includes("futbol") || s.includes("partido de") || s.includes("tenis") || s.includes("nba"))) {
    return true;
  }
  return false;
}

// Extra: bloqueo por dominios de ads/trackers típicos
const BLOCKED_DOMAINS_EXTRA = [
  "taboola.com","outbrain.com","adnxs.com","doubleclick.net","adservice.google.com",
  "clk","trk.","sponsor","/ads","/advert","clickbait"
];
function isProbablyAdDomain(u = "") {
  const host = (() => { try { return new URL(u).host.toLowerCase(); } catch { return ""; } })();
  return BLOCKED_DOMAINS_EXTRA.some((frag) => host.includes(frag));
}

/* ----------------------- Scoring por tema ----------------------- */
function topicScore(n, tema) {
  const { canon } = resolveTemaKeys(tema);
  const t = textOf(n);
  if (!t) return 0;

  const keys = TOPIC_KEYWORDS[canon] || [];
  let s = 0;
  for (const k of keys) if (t.includes(norm(k))) s += 1;

  const f = norm(n.fuente || n.source || "");
  if (canon === "tecnología" && /(tech|tecnol|wired|engadget|xataka|genbeta)/.test(f)) s += 1;
  if (canon === "ciencia" && /(nature|science|pnas|cell|sciencedaily)/.test(f)) s += 1;
  return s;
}

// Fallback si el util no trae softFilter → siempre usando CANON
const softFilterLocal =
  typeof _softFilterMaybe === "function"
    ? (items, temaSlug) => _softFilterMaybe(items, resolveTemaKeys(temaSlug).canon)
    : (items = [], temaSlug = "actualidad") => {
        if (!items.length) return [];
        const { canon } = resolveTemaKeys(temaSlug);

        if (canon === "actualidad") return [...items].sort(sortByDateDesc);

        const scored = items
          .map((n) => ({ n, s: topicScore(n, canon) }))
          .sort((a, b) => b.s - a.s || sortByDateDesc(a.n, b.n))
          .map((x) => x.n);

        const strong = scored.filter((n) => topicScore(n, canon) > 0);
        if (strong.length >= 3) return strong;

        return scored.slice(0, PAGE_SIZE);
      };

// Filtro por tema (Generales)
function filterByTema(list = [], temaSlug = "actualidad") {
  const arr = Array.isArray(list) ? list : [];
  // Limpieza dura
  let clean = arr.filter((n) => {
    const txt = textOf(n);
    const url = n.enlace || n.url || n.link || "";
    if (isAdOrSportsPromo(txt) || isBlockedByDomain(n) || isFarandulaOrSports(txt) || isProbablyAdDomain(url)) return false;
    return true;
  });

  const { canon } = resolveTemaKeys(temaSlug);

  // Actualidad/Todas -> ordenar y listo
  if (!canon || canon === "actualidad" || canon === "todas") {
    return softFilterLocal(dedupeByKey(clean), "actualidad");
  }

  // Scoring por tema
  const withScore = clean
    .map((n) => ({ n, s: topicScore(n, canon) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || sortByDateDesc(a.n, b.n))
    .map((x) => x.n);

  if (withScore.length >= 3) return dedupeByKey(withScore);

  // Fallback: sigue sesgado al TEMA (usar CANON)
  return softFilterLocal(dedupeByKey(clean), canon);
}

/* ======================= Componente ======================= */
export default function NoticiasOficina() {
  const [tipo, setTipo] = useState("juridica");
  const [especialidad, setEspecialidad] = useState("todas");
  const [tema, setTema] = useState(""); // solo general
  const [mostrarOtras, setMostrarOtras] = useState(false);
  const [q, setQ] = useState("");

  const [chips, setChips] = useState(CHIPS_JURIDICAS_FALLBACK);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);

  const [lastUrl, setLastUrl] = useState("");
  const [lastErr, setLastErr] = useState("");

  const [emptyEsps, setEmptyEsps] = useState(new Set());
  const [profile, setProfile] = useState(null);

  const abortRef = useRef(null);

  /* ---- Carga chips por tipo ---- */
  useEffect(() => {
    setEspecialidad("todas");
    setTema("");
    setItems([]);
    setPage(1);
    setHasMore(true);
    setEmptyEsps(new Set());
    setProfile(null);

    let cancelled = false;
    (async () => {
      try {
        if (tipo === "general") {
          const list = await getTemas({ lang: "es" });
          const keys = Array.isArray(list)
            ? list
                .map((x) => String(x?.key || x).toLowerCase().trim())
                .filter(Boolean)
            : [];
          const canonKeys = keys.map((k) => resolveTemaKeys(k).canon);
          const merged = Array.from(new Set(["todas", ...canonKeys]));
          if (!cancelled) setChips(merged.length ? merged : CHIPS_GENERALES_FALLBACK);
          return;
        }
        const list = await getEspecialidades({ tipo: "juridica" });
        const fromApi = Array.isArray(list)
          ? list
              .map((x) => String(x?.key || x).trim().toLowerCase())
              .filter((k) => k && k !== "todas" && k !== "general")
          : [];
        const merged = Array.from(
          new Set(["todas", ...CHIP_PRIORITY.filter((k) => "todas" !== k), ...fromApi])
        );
        if (!cancelled) setChips(merged);
      } catch {
        if (!cancelled)
          setChips(tipo === "general" ? CHIPS_GENERALES_FALLBACK : CHIPS_JURIDICAS_FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tipo]);

  /* ---- Core loader con fallback progresivo (JURÍDICAS) ---- */
  async function fetchJuridicasProgresivo(nextPage, signal, limit = PAGE_SIZE) {
    const esc = mapAlias(especialidad);
    const baseParams = { tipo: "juridica", page: nextPage, limit, lang: "es" };
    const providersCsv = "legis.pe,poder judicial,tribunal constitucional,tc";

    const attempts = [
      {
        note: "providers+sinceDays=2",
        params: {
          ...baseParams,
          especialidad: esc !== "todas" ? esc : undefined,
          providers: providersCsv,
          sinceDays: 2,
        },
      },
      {
        note: "providers+sinceDays=7",
        params: {
          ...baseParams,
          especialidad: esc !== "todas" ? esc : undefined,
          providers: providersCsv,
          sinceDays: 7,
        },
      },
      {
        note: "providers sin sinceDays",
        params: {
          ...baseParams,
          especialidad: esc !== "todas" ? esc : undefined,
          providers: providersCsv,
        },
      },
      {
        note: "sin providers (solo especialidad)",
        params: { ...baseParams, especialidad: esc !== "todas" ? esc : undefined },
      },
    ];

    if (esc && esc !== "todas") {
      const kws = ES_KEYWORDS[esc] || [];
      if (kws.length) {
        attempts.push({
          note: "fallback keywords (useQ=1)",
          params: { ...baseParams, q: kws.join(" "), useQ: 1, providers: providersCsv },
        });
        attempts.push({
          note: "fallback keywords sin providers (useQ=1)",
          params: { ...baseParams, q: kws.join(" "), useQ: 1 },
        });
      }
    }
    // Último: traer jurídicas y filtrar local
    attempts.push({
      note: "juridicas generales para filtrado local",
      params: { ...baseParams },
      filterLocal: true,
    });

    let chosen = null;
    let lastTried = null;

    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      const qs = new URLSearchParams(
        Object.entries(a.params).reduce((acc, [k, v]) => {
          if (v != null && v !== "") acc[k] = String(v);
          return acc;
        }, {})
      ).toString();
      const url = `${API_BASE}/noticias?${qs}`;
      setLastUrl(url);
      lastTried = a.note;

      try {
        const { items: nuevos } = await getNoticiasRobust({ ...a.params, signal });
        let arr = Array.isArray(nuevos) ? nuevos : [];
        if (DEBUG_NEWS)
          console.log(
            `[OV/JUR] intento="${a.note}" | esc="${esc}" | page=${nextPage} | limit=${limit} | recibidas=${arr.length}`
          );

        // Limpieza
        arr = arr.filter((n) => {
          const t = textOf(n);
          const url = n.enlace || n.url || n.link || "";
          return !(isAdOrSportsPromo(t) || isBlockedByDomain(n) || isFarandulaOrSports(t) || isProbablyAdDomain(url));
        });

        if (arr.length === 0) continue;

        if (a.filterLocal && esc && esc !== "todas") {
          const kws2 = ES_KEYWORDS[esc] || [];
          const textoMatch = (nn) => kws2.some((k) => textOf(nn).includes(norm(k)));
          const bagMatch = (nn) => {
            const bag = new Set(
              [...(nn?.especialidades || []), nn?.categoria || "", nn?.area || ""].map(mapAlias)
            );
            return bag.has(esc);
          };
          const filtered = arr.filter((nn) => bagMatch(nn) || textoMatch(nn));
          if (filtered.length > 0) {
            chosen = { note: a.note, arr: filtered };
            break;
          }
          continue;
        }

        chosen = { note: a.note, arr };
        break;
      } catch (e) {
        if (DEBUG_NEWS) console.warn(`[OV/JUR] intento="${a.note}" lanzó:`, e?.message || e);
      }
    }

    const base = dedupeByKey(chosen?.arr || []).sort(sortByDateDesc);
    setProfile(chosen?.note || lastTried || null);

    if (base.length === 0 && esc && esc !== "todas") {
      setEmptyEsps((prev) => new Set(prev).add(esc));
    }
    return prioritizeLegis(base);
  }

  /* ---- Fetch noticias (ambos tipos) ---- */
  async function fetchNoticias(reset = false) {
    if (loading) return;
    setLoading(true);
    setLastErr("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const nextPage = reset ? 1 : page;

      let payloadItems = [];
      if (tipo === "juridica") {
        payloadItems = await fetchJuridicasProgresivo(nextPage, controller.signal, PAGE_SIZE);
        // Purga general (anti farándula/ads) sin tocar especialidad
        payloadItems = filterByTema(dedupeByKey(payloadItems), "actualidad");
      } else {
        // GENERALES
        const temaSlug = (tema || "actualidad").toLowerCase();
        const { canon } = resolveTemaKeys(temaSlug);

        const params = {
          tipo: "general",
          page: nextPage,
          limit: PAGE_SIZE,
          lang: "es",
          tema: canon, // enviar canon al servidor
          signal: controller.signal,
        };
        const qs = new URLSearchParams(
          Object.entries(params).reduce((a, [k, v]) => {
            if (v != null && v !== "") a[k] = String(v);
            return a;
          }, {})
        ).toString();
        setLastUrl(`${API_BASE}/noticias?${qs}`);

        const { items: nuevos } = await getNoticiasRobust(params);
        const base = (Array.isArray(nuevos) ? nuevos : []).sort(sortByDateDesc);

        // Clasificador por TEMA del chip activo (canon)
        payloadItems = filterByTema(dedupeByKey(base), canon);
      }

      // Post-proceso Jurídicas: afinar por especialidad
      let mostradas = payloadItems;
      if (tipo === "juridica" && especialidad !== "todas") {
        const esc = mapAlias(especialidad);
        const textMatch = (needle, n) => {
          const texto = `${n?.titulo || ""} ${n?.resumen || ""} ${n?.fuente || ""}`.toLowerCase();
          const mapa = {
            procesal: ["proceso", "procesal", "procedimiento"],
            "seguridad social": ["seguridad social", "previsional", "essalud", "onp", "afp"],
            constitucional: ["constitucional", "tc", "tribunal constitucional", "derechos humanos"],
            notarial: ["notarial", "notario"],
            registral: ["registral", "sunarp", "registro"],
            penal: ["penal", "delito", "fiscal", "juzgado penal", "mp"],
            civil: ["civil", "contrato", "propiedad", "obligaciones"],
            laboral: ["laboral", "trabajador", "sunafil", "sindicato", "mintra"],
            administrativo: ["administrativo", "resolución", "expediente", "procedimiento"],
            comercial: ["comercial", "societario", "empresa"],
            tributario: ["tributario", "sunat", "impuesto", "igv", "renta"],
            ambiental: ["ambiental", "oefa", "mina"],
            penitenciario: ["penitenciario", "inpe", "prisión"],
            consumidor: ["consumidor", "indecopi"],
          };
          const bag = new Set(
            [...(n?.especialidades || []), n?.categoria || "", n?.area || ""].map(mapAlias)
          );
          if (bag.has(needle)) return true;
          return (mapa[needle] || []).some((k) => texto.includes(k));
        };
        mostradas = payloadItems.filter((n) => textMatch(esc, n));

        if (mostradas.length === 0) {
          setEmptyEsps((prev) => new Set(prev).add(esc));
        }
      }

      // Commit
      setItems((prev) => (reset ? mostradas : [...prev, ...mostradas]));
      setPage(nextPage + 1);
      setHasMore(mostradas.length >= PAGE_SIZE);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("❌ Error noticias OV:", e?.message || e);
        setLastErr(e?.message || String(e));
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  /* ---- “Ver más noticias” (misma vista) ---- */
  async function verMasChip() {
    if (loading) return;
    setLoading(true);
    setLastErr("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (tipo === "juridica") {
        const extendidas = await fetchJuridicasProgresivo(1, controller.signal, EXTENDED_LIMIT);
        const puras = filterByTema(dedupeByKey(extendidas), "actualidad");
        const esc = mapAlias(especialidad);
        const filtradas =
          esc === "todas"
            ? puras
            : puras.filter((n) => {
                const bag = new Set(
                  [...(n?.especialidades || []), n?.categoria || "", n?.area || ""].map(mapAlias)
                );
                const t = `${n?.titulo || ""} ${n?.resumen || ""}`.toLowerCase();
                const extra = (ES_KEYWORDS[esc] || []).some((k) => t.includes(norm(k)));
                return bag.has(esc) || extra;
              });
        setItems(dedupeByKey(filtradas).sort(sortByDateDesc));
        setHasMore(false);
        setPage(2);
        return;
      }

      // GENERALES
      const temaSlug = (tema || "actualidad").toLowerCase();
      const { canon } = resolveTemaKeys(temaSlug);

      const { items: nuevos } = await getNoticiasRobust({
        tipo: "general",
        page: 1,
        limit: EXTENDED_LIMIT,
        lang: "es",
        tema: canon, // ✅ enviar canon al backend
        signal: controller.signal,
      });
      const base = (Array.isArray(nuevos) ? nuevos : []).sort(sortByDateDesc);
      const filtradas = filterByTema(dedupeByKey(base), canon);
      setItems(filtradas);
      setHasMore(false);
      setPage(2);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("❌ Ver más:", e?.message || e);
        setLastErr(e?.message || String(e));
      }
    } finally {
      setLoading(false);
    }
  }

  /* ---- Recargas por filtro ---- */
  useEffect(() => {
    clearNoticiasCache?.();
    setItems([]);
    setPage(1);
    setHasMore(true);
    abortRef.current?.abort();
    const t = setTimeout(() => fetchNoticias(true), 80);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, especialidad, tema]);

  /* ---- Buscador local ---- */
  const filtradas = useMemo(() => {
    const query = norm(q || "");
    if (!query) return items;
    return items.filter((n) => textOf(n).includes(query));
  }, [items, q]);

  const openReader = (n) => {
    setSel(n);
    setOpen(true);
  };
  const closeReader = () => {
    setOpen(false);
    setSel(null);
  };

  /* ======================= UI ======================= */
  const activeChip = tipo === "juridica" ? especialidad : tema || "todas";

  const renderChipList = (arr) =>
    sortChips(arr)
      .filter((a) => {
        const key = mapAlias(a);
        if (PERMA_HIDE.has(key)) return false;
        if (tipo === "juridica" && emptyEsps.has(key)) return false;
        return true;
      })
      .map((a) => (
        <button
          key={a}
          onClick={() =>
            tipo === "juridica" ? setEspecialidad(a) : setTema(a === "todas" ? "" : a)
          }
          className={chipClass(activeChip === a)}
        >
          {pretty(a)}
        </button>
      ));

  return (
    <div className="relative h-[calc(100vh-80px)] bg-[#fffaf6] rounded-2xl border border-[#f1e5dc] shadow-[0_6px_32px_-10px_rgba(176,58,26,0.08)]">
      <div className="h-full grid md:grid-cols-[240px,1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden md:block border-r border-[#f1e5dc] p-4 overflow-y-auto">
          <div className="flex gap-2 mb-3">
            {[
              { key: "juridica", label: "Jurídicas" },
              { key: "general", label: "Generales" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`px-3 py-1.5 rounded-full font-semibold transition ${
                  tipo === t.key
                    ? "bg-[#b03a1a] text-white"
                    : "bg-white text-[#b03a1a] border border-[#e7d4c8]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <h4 className="text-xs font-bold text-[#4a2e23] mb-2">
            {tipo === "juridica" ? "Especialidades" : "Temas"}
          </h4>
          <div className="flex flex-col gap-2">{renderChipList(chips)}</div>

          {tipo === "juridica" && (
            <>
              <div className="h-px bg-[#f1e5dc] my-3" />
              <button
                onClick={() => setMostrarOtras((v) => !v)}
                className="px-3 py-1.5 rounded-full font-semibold bg-white text-[#b03a1a] border border-[#e7d4c8] w-full"
              >
                {mostrarOtras ? "Ocultar otras" : "Otras especialidades"}
              </button>
              {mostrarOtras && (
                <div className="mt-2 flex flex-col gap-2">{renderChipList(OTRAS)}</div>
              )}
            </>
          )}

          <div className="h-px bg-[#f1e5dc] my-3" />
          <details className="mt-1">
            <summary className="text-xs text-[#8a6e60] cursor-pointer">Diagnóstico</summary>
            <div className="mt-1 text-[11px] text-[#6b4d3e] break-words">
              <div>
                <b>API_BASE:</b> {API_BASE}
              </div>
              <div>
                <b>URL:</b> {lastUrl || "—"}
              </div>
              {profile && (
                <div>
                  <b>Perfil:</b> {profile}
                </div>
              )}
              {lastErr && (
                <div className="text-red-600">
                  <b>Error:</b> {lastErr}
                </div>
              )}
            </div>
          </details>
        </aside>

        {/* Contenido */}
        <main className="overflow-y-auto">
          {/* Header móvil */}
          <header className="md:hidden sticky top-0 z-10 bg-[#fff6ef]/95 backdrop-blur px-3 pt-3 pb-2 border-b border-[#f1e5dc]">
            <div className="flex gap-2 mb-2">
              {[
                { key: "juridica", label: "Jurídicas" },
                { key: "general", label: "Generales" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTipo(t.key)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition ${
                    tipo === t.key
                      ? "bg-[#b03a1a] text-white"
                      : "bg-white text-[#b03a1a] border border-[#e7d4c8]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div id="chips-scroll" className="flex gap-2 overflow-x-auto no-scrollbar">
              {renderChipList(chips)}
            </div>

            <div className="mt-2">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en los resultados…"
                className="w-full px-3 py-2 rounded-xl border border-[#e7d4c8] outline-none bg-white"
              />
            </div>
          </header>

          {/* Búsqueda desktop */}
          <div className="hidden md:block px-5 pt-5">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en los resultados…"
              className="w-full max-w-3xl px-4 py-2 rounded-xl border border-[#e7d4c8] outline-none bg-white"
            />
          </div>

          {/* Lista */}
          <section className="px-3 sm:px-5 py-5">
            {loading && items.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[#f1e5dc] overflow-hidden">
                    <div className="animate-pulse bg-[#f0e7e1] aspect-[16/9]" />
                    <div className="p-3 space-y-2 animate-pulse">
                      <div className="h-4 bg-[#f0e7e1] rounded" />
                      <div className="h-4 bg-[#f0e7e1] rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtradas.length === 0 ? (
              <p className="text-center text-[#b03a1a] font-semibold">
                No hay noticias en esta {tipo === "juridica" ? "especialidad" : "categoría"}.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtradas.map((n, i) => {
                  const img = resolveCardImage(n);
                  return (
                    <article
                      key={n.id || n._id || n.enlace || `${n.titulo}#${i}`}
                      className="rounded-xl bg-white border border-[#f1e5dc] shadow-sm hover:shadow-md overflow-hidden cursor-pointer transition"
                      onClick={() => openReader(n)}
                      title="Abrir lector"
                    >
                      <div className="relative aspect-[16/9] bg-[#f6f2ee]">
                        <img
                          src={img.src}
                          data-raw={img.raw || ""}
                          alt={n.titulo || "Noticia"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const el = e.currentTarget;
                            const raw = el.getAttribute("data-raw") || "";
                            const triedRaw = el.getAttribute("data-tried-raw") === "1";
                            const triedFallback = el.getAttribute("data-tried-fallback") === "1";

                            if (raw && !triedRaw && el.src !== raw) {
                              el.setAttribute("data-tried-raw", "1");
                              el.src = raw;
                              return;
                            }
                            if (!triedFallback && el.src !== FALLBACK_IMG) {
                              el.setAttribute("data-tried-fallback", "1");
                              el.src = FALLBACK_IMG;
                              return;
                            }
                            if (el.src !== ULTIMATE_SVG) el.src = ULTIMATE_SVG;
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white px-3 py-2 text-sm line-clamp-3 md:line-clamp-2">
                          {n.titulo || "(Sin título)"}
                        </div>
                      </div>
                      <div className="p-3">
                        {(n.resumen || n.description) && (
                          <p className="text-sm text-[#6b4d3e] line-clamp-5">
                            {n.resumen || n.description}
                          </p>
                        )}
                        <div className="mt-3 flex justify-between text-xs text-[#8a6e60]">
                          <span className="truncate">{n.fuente || n.source || "—"}</span>
                          {n.fecha && (
                            <time title={new Date(n.fecha).toLocaleString("es-PE")}>
                              {new Date(n.fecha).toLocaleDateString("es-PE")}
                            </time>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  disabled={loading}
                  onClick={() => fetchNoticias(false)}
                  className="px-5 py-2 rounded-lg bg-[#b03a1a] text-white font-semibold disabled:opacity-60 hover:bg-[#a63a1e]"
                >
                  {loading ? "Cargando…" : "Cargar más"}
                </button>
              </div>
            )}

            {/* CTA final por chip activo */}
            {(tipo === "juridica" ? especialidad !== "todas" : (tema || "") !== "") && (
              <div className="mt-4 flex justify-center">
                <button
                  disabled={loading}
                  onClick={verMasChip}
                  className="px-5 py-2 rounded-lg border border-[#e7d4c8] text-[#b03a1a] bg-white font-semibold hover:bg-[#fff2ea] disabled:opacity-60"
                  title={`Ver más noticias de ${pretty(tipo === "juridica" ? especialidad : tema)}`}
                >
                  Ver más noticias de {pretty(tipo === "juridica" ? especialidad : tema)}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      <ReaderModal open={open} item={sel} onClose={closeReader} />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
