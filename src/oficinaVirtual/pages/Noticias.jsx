// src/oficinaVirtual/pages/Noticias.jsx
/* ============================================================
 * 🦉 BÚHOLEX | Noticias Jurídicas Inteligentes (Oficina Virtual)
 * - Jurídicas: providers oficiales + fallback progresivo + keywords por especialidad
 * - Generales: por tema (chips)
 * - Imagen robusta con proxy + OG + favicon + fallback
 * - Responsive móvil/tablet/desktop
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

/* ----------------------- Constantes ----------------------- */
const PAGE_SIZE = 12;
const FALLBACK_IMG = "/assets/img/noticia_fallback.png";
const MAX_AGE_DAYS = 2; // objetivo inicial

// Flag de depuración
const DEBUG_NEWS = (import.meta?.env?.VITE_DEBUG_NEWS ?? "true").toString() !== "false";

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

/* ----------------------- Helpers fecha ----------------------- */
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
  "todas", "penal", "civil", "laboral", "constitucional", "familiar",
  "administrativo", "comercial", "tributario", "procesal", "registral",
  "ambiental", "notarial", "penitenciario", "consumidor", "seguridad social",
];
const CHIPS_GENERALES_FALLBACK = [
  "todas", "política", "economía", "sociedad", "ciencia", "tecnología",
  "corrupción", "internacional",
];
const OTRAS = ["comercial","tributario","procesal","registral","ambiental","notarial","penitenciario","consumidor","seguridad social"];

const norm = (s) => (s ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim();

/* Alias robusto (incluye femeninos/plurales comunes en data) */
const ALIAS = {
  tc: "constitucional",
  "tribunal constitucional": "constitucional",
  tribunalconst: "constitucional",
  proceso: "procesal",
  procedimiento: "procesal",
  regstral: "registral",
  registrales: "registral",
  registral: "registral",
  "seguridadsocial": "seguridad social",
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
  "todas","penal","civil","laboral","constitucional","familiar","administrativo",
  "comercial","tributario","procesal","registral","ambiental","notarial",
  "penitenciario","consumidor","seguridad social",
];
const sortChips = (arr) => {
  const idx = (v) => CHIP_PRIORITY.indexOf(v);
  return [...arr].filter(Boolean).sort((a,b)=>{
    const ia=idx(a), ib=idx(b);
    if (ia!==-1 || ib!==-1) return (ia===-1?999:ia)-(ib===-1?999:ib);
    return a.localeCompare(b,"es");
  });
};
const pretty = (s) => {
  const m = String(s||"").toLowerCase();
  if (m==="tc") return "TC";
  if (m==="seguridad social") return "Seguridad social";
  return m.charAt(0).toUpperCase()+m.slice(1);
};
const chipClass = (active) =>
  `px-3 py-1.5 rounded-full border text-sm font-semibold shrink-0 transition
   ${active
     ? "bg-[#b03a1a] text-white border-[#b03a1a] shadow-[0_2px_10px_rgba(176,58,26,.25)]"
     : "text-[#4a2e23] border-[#e7d4c8] bg-white hover:bg-[#fff2ea]"}`;

/* ----------------------- Imagen / Proxy ----------------------- */
const PROVIDER_LOGOS = {
  "legis.pe": "/assets/providers/legispe.png",
  "poder judicial": "/assets/providers/poder-judicial.png",
  "tribunal constitucional": "/assets/providers/tc.png",
  "tc": "/assets/providers/tc.png",
  "el país": "/assets/providers/elpais.png",
  "rpp": "/assets/providers/rpp.png",
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
  } catch { return raw; }
}
function normalizeUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s) return "";
  return s.replace(/\s+/g, "");
}
function proxyUrl(absUrl) {
  const url = normalizeUrl(absUrl);
  if (!url) return "";
  if (isExternal(url)) return `${API_BASE.replace(/\/+$/, "")}/media/proxy?url=${encodeURIComponent(url)}`;
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
    n.imagen, n.image, n.imageUrl, n.urlToImage, n.thumbnail, n.thumbnailUrl,
    n?.enclosure?.url, n?.enclosure?.link,
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
    const ogEndpoint = `${API_BASE.replace(/\/+$/,"")}/media/og?url=${encodeURIComponent(enlace)}`;
    return { src: ogEndpoint, raw: "" };
  } else if (enlace) { // <- corrección: este branch ya no se ejecutaba sin else
    const fav = `${API_BASE.replace(/\/+$/,"")}/media/favicon?url=${encodeURIComponent(enlace)}`;
    return { src: fav, raw: "" };
  }
  return { src: FALLBACK_IMG, raw: "" };
}
const prioritizeLegis = (list=[]) => {
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

  // Especialidades que dieron 0 → ocultarlas temporalmente
  const [emptyEsps, setEmptyEsps] = useState(new Set());
  // Perfil del intento que rindió
  const [profile, setProfile] = useState(null);

  const abortRef = useRef(null);

  /* ---- Carga chips por tipo ---- */
  useEffect(() => {
    setEspecialidad("todas");
    setTema("");
    setItems([]); setPage(1); setHasMore(true);
    setEmptyEsps(new Set());
    setProfile(null);

    let cancelled = false;
    (async () => {
      try {
        if (tipo === "general") {
          const list = await getTemas({ lang: "es" });
          const keys = Array.isArray(list) ? list.map(x => String(x?.key || x).toLowerCase().trim()).filter(Boolean) : [];
          const merged = Array.from(new Set(["todas", ...keys]));
          if (!cancelled) setChips(merged.length ? merged : CHIPS_GENERALES_FALLBACK);
          return;
        }
        const list = await getEspecialidades({ tipo: "juridica" });
        const fromApi = Array.isArray(list)
          ? list.map(x => String(x?.key || x).trim().toLowerCase()).filter(k => k && k!=="todas" && k!=="general")
          : [];
        const merged = Array.from(new Set(["todas", ...CHIP_PRIORITY.filter(k=>"todas"!==k), ...fromApi]));
        if (!cancelled) setChips(merged);
      } catch {
        if (!cancelled) setChips(tipo === "general" ? CHIPS_GENERALES_FALLBACK : CHIPS_JURIDICAS_FALLBACK);
      }
    })();
    return () => { cancelled = true; };
  }, [tipo]);

  /* ---- Core loader con fallback progresivo (JURÍDICAS) ---- */
  async function fetchJuridicasProgresivo(nextPage, signal) {
    const esc = mapAlias(especialidad);
    const baseParams = {
      tipo: "juridica",
      page: nextPage,
      limit: PAGE_SIZE,
      lang: "es",
    };
    const providersCsv = "legis.pe,poder judicial,tribunal constitucional,tc";

    // Intentos del más estricto al más laxo (2 → 7 → sin since → sin providers)
    const attempts = [
      { note: "providers+sinceDays=2",
        params: { ...baseParams, especialidad: esc !== "todas" ? esc : undefined, providers: providersCsv, sinceDays: 2 } },
      { note: "providers+sinceDays=7",
        params: { ...baseParams, especialidad: esc !== "todas" ? esc : undefined, providers: providersCsv, sinceDays: 7 } },
      { note: "providers sin sinceDays",
        params: { ...baseParams, especialidad: esc !== "todas" ? esc : undefined, providers: providersCsv } },
      { note: "sin providers (solo especialidad)",
        params: { ...baseParams, especialidad: esc !== "todas" ? esc : undefined } },
    ];

    // Fallback con keywords (benigno)
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

    // Último recurso: traer jurídicas generales y filtrar en cliente
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
        Object.entries(a.params).reduce((acc,[k,v])=>{ if (v!=null && v!=="") acc[k]=String(v); return acc; },{})
      ).toString();
      const url = `${API_BASE}/noticias?${qs}`;
      setLastUrl(url);
      lastTried = a.note;

      try {
        const { items: nuevos } = await getNoticiasRobust({ ...a.params, signal });
        const arr = Array.isArray(nuevos) ? nuevos : [];
        if (DEBUG_NEWS) {
          console.log(`[OV/JUR] intento="${a.note}" | esc="${esc}" | page=${nextPage} | recibidas=${arr.length}`);
        }
        if (arr.length === 0) continue;

        if (a.filterLocal && esc && esc !== "todas") {
          const kws = ES_KEYWORDS[esc] || [];
          const textoMatch = (n) => {
            const texto = `${n?.titulo||""} ${n?.resumen||""} ${n?.fuente||""}`.toLowerCase();
            return kws.some(k => texto.includes(k.toLowerCase()));
          };
          const bagMatch = (n) => {
            const bag = new Set([...(n?.especialidades||[]),(n?.categoria||""),(n?.area||"")].map(mapAlias));
            return bag.has(esc);
          };
          const filtered = arr.filter(n => bagMatch(n) || textoMatch(n));
          if (DEBUG_NEWS) {
            console.log(`[OV/JUR] filtroLocal | esc="${esc}" => filtradas=${filtered.length}`);
          }
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

    const result = (chosen?.arr || []).sort(sortByDateDesc);
    setProfile(chosen?.note || lastTried || null);

    if ((result.length === 0) && esc && esc !== "todas") {
      setEmptyEsps((prev) => new Set(prev).add(esc));
    }

    return prioritizeLegis(result);
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
        payloadItems = await fetchJuridicasProgresivo(nextPage, controller.signal);
      } else {
        // GENERALES normal
        const params = {
          tipo: "general",
          page: nextPage,
          limit: PAGE_SIZE,
          lang: "es",
          tema: tema || undefined,
          signal: controller.signal,
        };
        const qs = new URLSearchParams(Object.entries(params).reduce((a,[k,v])=>{ if (v!=null && v!=="") a[k]=String(v); return a; },{})).toString();
        setLastUrl(`${API_BASE}/noticias?${qs}`);
        const { items: nuevos } = await getNoticiasRobust(params);
        payloadItems = (Array.isArray(nuevos) ? nuevos : []).sort(sortByDateDesc);
      }

      // Filtrado cliente suave para jurídicas por especialidad
      let mostradas = payloadItems;
      if (tipo === "juridica" && especialidad !== "todas") {
        const esc = mapAlias(especialidad);
        const textMatch = (needle, n) => {
          const texto = `${n?.titulo||""} ${n?.resumen||""} ${n?.fuente||""}`.toLowerCase();
          const mapa = {
            procesal: ["proceso","procesal","procedimiento"],
            "seguridad social": ["seguridad social","previsional","essalud","onp","afp"],
            constitucional: ["constitucional","tc","tribunal constitucional","derechos humanos"],
            notarial: ["notarial","notario"],
            registral: ["registral","sunarp","registro"],
            penal: ["penal","delito","fiscal","juzgado penal","mp"],
            civil: ["civil","contrato","propiedad","obligaciones"],
            laboral: ["laboral","trabajador","sunafil","sindicato","mintra"],
            administrativo: ["administrativo","resolución","expediente","procedimiento"],
            comercial: ["comercial","societario","empresa"],
            tributario: ["tributario","sunat","impuesto","igv","renta"],
            ambiental: ["ambiental","oefa","mina"],
            penitenciario: ["penitenciario","inpe","prisión"],
            consumidor: ["consumidor","indecopi"],
          };
          const bag = new Set([...(n?.especialidades||[]),(n?.categoria||""),(n?.area||"")].map(mapAlias));
          if (bag.has(needle)) return true;
          return (mapa[needle]||[]).some(k=>texto.includes(k));
        };
        mostradas = payloadItems.filter(n => textMatch(esc,n));

        if (mostradas.length === 0) {
          setEmptyEsps((prev) => new Set(prev).add(esc));
        }
      }

      setItems((prev) => (reset ? mostradas : [...prev, ...mostradas]));
      setPage(nextPage + 1);
      setHasMore(mostradas.length >= PAGE_SIZE);

      if (reset && DEBUG_NEWS) {
        console.log(
          "[Noticias OV]",
          "| tipo=", tipo,
          "| especialidad=", especialidad,
          "| tema=", tema,
          "| page=", nextPage,
          "| mostradas=", mostradas.length,
          "| profile=", profile || "—"
        );
      }
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

  /* ---- Recargas por filtro ---- */
  useEffect(() => {
    clearNoticiasCache?.();
    setItems([]); setPage(1); setHasMore(true);
    abortRef.current?.abort();
    const t = setTimeout(() => fetchNoticias(true), 80);
    return () => { clearTimeout(t); abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, especialidad, tema]);

  /* ---- Buscador local ---- */
  const filtradas = useMemo(() => {
    const text = (q || "").trim().toLowerCase();
    if (!text) return items;
    return items.filter((n) => {
      const t = (n?.titulo || "").toLowerCase();
      const r = (n?.resumen || "").toLowerCase();
      const f = (n?.fuente || "").toLowerCase();
      return t.includes(text) || r.includes(text) || f.includes(text);
    });
  }, [items, q]);

  const openReader = (n) => { setSel(n); setOpen(true); };
  const closeReader = () => { setOpen(false); setSel(null); };

  /* ======================= UI ======================= */
  const activeChip = tipo === "juridica" ? especialidad : (tema || "todas");

  const renderChipList = (arr) => (
    sortChips(arr)
      .filter((a) => {
        const key = mapAlias(a);
        if (PERMA_HIDE.has(key)) return false;     // ⟵ ocultación permanente
        if (tipo === "juridica" && emptyEsps.has(key)) return false; // ⟵ ocultación dinámica
        return true;
      })
      .map((a) => (
        <button
          key={a}
          onClick={() => (tipo === "juridica" ? setEspecialidad(a) : setTema(a === "todas" ? "" : a))}
          className={chipClass(activeChip === a)}
        >
          {pretty(a)}
        </button>
      ))
  );

  return (
    <div className="relative h-[calc(100vh-80px)] bg-[#fffaf6] rounded-2xl border border-[#f1e5dc] shadow-[0_6px_32px_-10px_rgba(176,58,26,0.08)]">
      <div className="h-full grid md:grid-cols-[240px,1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden md:block border-r border-[#f1e5dc] p-4 overflow-y-auto">
          <div className="flex gap-2 mb-3">
            {[{ key: "juridica", label: "Jurídicas" }, { key: "general", label: "Generales" }].map((t) => (
              <button
                key={t.key}
                onClick={() => setTipo(t.key)}
                className={`px-3 py-1.5 rounded-full font-semibold transition ${
                  tipo === t.key ? "bg-[#b03a1a] text-white" : "bg-white text-[#b03a1a] border border-[#e7d4c8]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <h4 className="text-xs font-bold text-[#4a2e23] mb-2">
            {tipo === "juridica" ? "Especialidades" : "Temas"}
          </h4>
          <div className="flex flex-col gap-2">
            {renderChipList(chips)}
          </div>

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
                <div className="mt-2 flex flex-col gap-2">
                  {renderChipList(OTRAS)}
                </div>
              )}
            </>
          )}

          <div className="h-px bg-[#f1e5dc] my-3" />
          <details className="mt-1">
            <summary className="text-xs text-[#8a6e60] cursor-pointer">Diagnóstico</summary>
            <div className="mt-1 text-[11px] text-[#6b4d3e] break-words">
              <div><b>API_BASE:</b> {API_BASE}</div>
              <div><b>URL:</b> {lastUrl || "—"}</div>
              {profile && <div><b>Perfil:</b> {profile}</div>}
              {lastErr && <div className="text-red-600"><b>Error:</b> {lastErr}</div>}
            </div>
          </details>
        </aside>

        {/* Contenido */}
        <main className="overflow-y-auto">
          {/* Header móvil */}
          <header className="md:hidden sticky top-0 z-10 bg-[#fff6ef]/95 backdrop-blur px-3 pt-3 pb-2 border-b border-[#f1e5dc]">
            <div className="flex gap-2 mb-2">
              {[{ key: "juridica", label: "Jurídicas" }, { key: "general", label: "Generales" }].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTipo(t.key)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition ${
                    tipo === t.key ? "bg-[#b03a1a] text-white" : "bg-white text-[#b03a1a] border border-[#e7d4c8]"}`}
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
                              console.warn("[IMG] Proxy falló, intento RAW:", raw);
                              el.src = raw;
                              return;
                            }
                            if (!triedFallback && el.src !== FALLBACK_IMG) {
                              el.setAttribute("data-tried-fallback", "1");
                              console.warn("[IMG] RAW falló, Fallback:", FALLBACK_IMG);
                              el.src = FALLBACK_IMG;
                              return;
                            }
                            if (el.src !== ULTIMATE_SVG) {
                              console.error("[IMG] Fallback ausente. Usando SVG.");
                              el.src = ULTIMATE_SVG;
                            }
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
