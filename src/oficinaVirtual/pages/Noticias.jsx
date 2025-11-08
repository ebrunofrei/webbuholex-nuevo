/* ============================================================
   🦉 BÚHOLEX | Noticias Jurídicas Inteligentes (Oficina Virtual)
   - Carga rápida y estable (control por red/dispositivo)
   - Fallbacks de búsqueda por especialidad (diccionario ampliado)
   - Imagen robusta con proxy y retry RAW + SVG final
   - Prioriza legis.pe en jurídicas
   - Evita duplicados por enlace / título
   ============================================================ */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReaderModal from "@/components/ui/ReaderModal";
import {
  API_BASE,
  getNoticiasRobust,
  getEspecialidades,
  clearNoticiasCache,
} from "@/services/noticiasClientService";

/* ----------------------- Flags & Config ----------------------- */
const DEBUG_NEWS =
  (import.meta?.env?.VITE_DEBUG_NEWS ?? "false").toString().toLowerCase() === "true";

// Tamaño de página adaptable: móvil/red lenta → menos; desktop/red rápida → más
const NAV_CONN = typeof navigator !== "undefined" && navigator.connection ? navigator.connection : null;
const NET_TYPE = NAV_CONN?.effectiveType || ""; // 'slow-2g' | '2g' | '3g' | '4g'
const IS_SLOW = NET_TYPE === "slow-2g" || NET_TYPE === "2g";
const DPR = typeof window !== "undefined" ? Math.max(1, Math.min(3, window.devicePixelRatio || 1)) : 1;

const BASE_PAGE = IS_SLOW ? 9 : 12;
const PAGE_SIZE = Math.max(BASE_PAGE, DPR >= 2 ? 15 : 12);

// Límite ampliado para “ver más”/fallbacks
const EXTENDED_LIMIT = Math.max(PAGE_SIZE * 2, 24);

// Imágenes
const FALLBACK_IMG = "/assets/img/noticia_fallback.png";
const ULTIMATE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
  <defs><linearGradient id="g" x1="0" x2="1">
    <stop offset="0%" stop-color="#f6f2ee"/><stop offset="100%" stop-color="#eee4dc"/>
  </linearGradient></defs>
  <rect width="800" height="450" fill="url(#g)"/>
  <g fill="#b03a1a" opacity="0.9"><rect x="40" y="340" width="720" height="36" rx="6"/></g>
  <text x="60" y="365" font-family="Arial, sans-serif" font-size="24" fill="#fff">BúhoLex</text>
</svg>`);

/* ----------------------- Chips/UX ----------------------- */
const CHIPS_JURIDICAS_FALLBACK = [
  "todas","penal","civil","laboral","constitucional","familiar","administrativo",
  "comercial","tributario","procesal","registral","ambiental","notarial",
  "penitenciario","consumidor","seguridad social",
];
const CHIPS_GENERALES_FALLBACK = [
  "todas","política","economía","sociedad","ciencia","tecnología","corrupción","internacional",
];
const OTRAS = ["comercial","tributario","procesal","registral","ambiental","notarial","penitenciario","consumidor","seguridad social"];
const AFINES = ["jurisprudencia","doctrina","procesal","reformas","precedente","casación","tribunal constitucional"];

/* ----------------------- Utilidades ----------------------- */
const norm = (s) => (s ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim();

const ALIAS = {
  tc: "constitucional",
  "tribunal constitucional": "constitucional",
  tribunalconst: "constitucional",
  proceso: "procesal",
  procedimiento: "procesal",
  regístral: "registral",
  seguridadsocial: "seguridad social",
  "derechos humanos": "constitucional",
  internacional: "internacional",
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

// Diccionario ampliado por especialidad (palabras clave más generosas)
const ES_KEYWORDS = {
  penal: [
    "penal","delito","delictivo","fiscal","ministerio público","mp","juzgado penal","prisión","prision","homicidio","robo",
    "extorsión","extorsion","trata","lavado de activos","corrupción","corrupcion","acusación","acusacion","sentencia penal",
    "inimputabilidad","prisión preventiva","prision preventiva","audiencia de prisión","habeas corpus"
  ],
  civil: [
    "civil","contrato","obligaciones","propiedad","posesión","posesion","usucapión","usucapion","arrendamiento","indemnización",
    "indemnizacion","responsabilidad civil","daños y perjuicios","dano moral","hipoteca","sucesiones","herencia"
  ],
  laboral: [
    "laboral","trabajador","empleador","remuneración","remuneracion","compensación","compensacion","sindicato","mintra",
    "sunafil","cts","despido","reposición","reposicion","vacaciones","jornada","hostigamiento laboral"
  ],
  constitucional: [
    "constitucional","tc","tribunal constitucional","amparo","inconstitucionalidad","habeas corpus","hábeas corpus","derechos fundamentales",
    "precedente vinculante","control difuso","control concentrado"
  ],
  familiar: [
    "familia","familiar","tenencia","alimentos","régimen de visitas","regimen de visitas","patria potestad","adopción","adopcion","violencia familiar"
  ],
  administrativo: [
    "administrativo","resolución","resolucion","procedimiento administrativo","tupa","sancionador","infracción","infraccion","silencio administrativo",
    "nulidad de oficio","acto administrativo"
  ],
  comercial: [
    "comercial","societario","empresa","sociedad anónima","concurso","quiebra","título valor","titulo valor","letra de cambio","pagaré","pagare",
    "factoring","fusiones","adquisiciones","junta de accionistas"
  ],
  tributario: [
    "tributario","sunat","igv","renta","impuesto","tributo","fiscalización","fiscalizacion","devolución","devolucion","infracción tributaria",
    "infraccion tributaria","tribunal fiscal"
  ],
  procesal: [
    "proceso","procesal","procedimiento","casación","casacion","apelación","apelacion","medida cautelar","cautelar","competencia",
    "prueba","nulidad procesal","impugnación","impugnacion"
  ],
  registral: [
    "registral","sunarp","registro","partida registral","asiento registral","inmatriculación","inmatriculacion","título","titulo","calificación registral"
  ],
  ambiental: [
    "ambiental","oefa","mina","minería","mineria","eia","impacto ambiental","residuos","contaminación","contaminacion","áreas naturales",
  ],
  notarial: [
    "notarial","notario","escritura pública","escritura publica","legalización","legalizacion","protesto","transferencia de dominio"
  ],
  penitenciario: [
    "penitenciario","inpe","cárcel","carcel","beneficios penitenciarios","redención","redencion","semilibertad","libertad condicional"
  ],
  consumidor: [
    "consumidor","indecopi","protección al consumidor","proteccion al consumidor","cláusulas abusivas","clausulas abusivas","garantía","garantia","idoneidad"
  ],
  "seguridad social": [
    "seguridad social","previsional","pensión","pension","onp","afp","essalud","jubilación","jubilacion"
  ],
  "derechos humanos": [
    "derechos humanos","cidh","corte idh","onu","convención","convencion","tratos crueles"
  ],
  internacional: [
    "internacional","cancillería","cancilleria","extradición","extradicion","cooperación judicial","cooperacion judicial","la haya","derecho internacional"
  ],
};

// Heurística final que usa ES_KEYWORDS y sinónimos básicos
function matchEspecialidad(needle, valorTexto) {
  if (!needle || needle === "todas") return true;
  const esc = mapAlias(needle);
  const txt = (valorTexto || "").toLowerCase();

  const bag = ES_KEYWORDS[esc] || [];
  if (bag.some(k => txt.includes(k.toLowerCase()))) return true;

  const compat = {
    procesal: ["casación","casacion","apelación","apelacion","cautelar"],
    "seguridad social": ["previsional","pensión","pension","essalud","onp","afp"],
    constitucional: ["amparo","habeas","hábeas"],
    notarial: ["escritura pública","escritura publica","legalización","legalizacion"],
    registral: ["sunarp","partida registral","inmatriculación","inmatriculacion"],
    penal: ["delito","fiscal","mp","prisión","prision"],
    civil: ["contrato","propiedad","obligaciones","posesión","posesion"],
    laboral: ["trabajador","sindicato","mintra","sunafil","remuneración","remuneracion"],
  };
  return (compat[esc] || []).some(k => txt.includes(k));
}

/* ---------- Imagen & proxy ---------- */
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
  if (isExternal(url)) {
    return `${API_BASE.replace(/\/+$/, "")}/media/proxy?url=${encodeURIComponent(url)}`;
  }
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
  }
  if (enlace) {
    const fav = `${API_BASE.replace(/\/+$/,"")}/media/favicon?url=${encodeURIComponent(enlace)}`;
    return { src: fav, raw: "" };
  }
  return { src: FALLBACK_IMG, raw: "" };
}

// Prioriza legis.pe y quita duplicados
const dedupeByKey = (arr = []) => {
  const seen = new Set();
  const out = [];
  for (const n of arr) {
    const key = (n.enlace || n.url || n.link || n.titulo || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
};
function prioritizeLegis(list = []) {
  const isLegis = (n) => /legis\.pe/i.test(n?.fuente || n?.source || "");
  const a = [], b = [];
  for (const it of dedupeByKey(list)) (isLegis(it) ? a : b).push(it);
  return [...a, ...b];
}

/* ======================= Componente ======================= */
export default function NoticiasOficina() {
  const [tipo, setTipo] = useState("juridica");
  const [especialidad, setEspecialidad] = useState("todas");
  const [tema, setTema] = useState("");
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

  const abortRef = useRef(null);

  /* ---- Carga chips por tipo ---- */
  useEffect(() => {
    setEspecialidad("todas");
    setTema("");
    setItems([]); setPage(1); setHasMore(true);

    if (tipo === "general") {
      setChips(CHIPS_GENERALES_FALLBACK);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await getEspecialidades({ tipo: "juridica", providers: "all" });
        const fromApi = Array.isArray(list)
          ? list.map(x => String(x?.key || x).trim().toLowerCase())
                .filter(k => k && k!=="todas" && k!=="general")
          : [];
        const merged = Array.from(new Set(["todas", ...CHIP_PRIORITY.filter(k=>"todas"!==k), ...fromApi]));
        if (!cancelled) setChips(merged);
      } catch {
        if (!cancelled) setChips(CHIPS_JURIDICAS_FALLBACK);
      }
    })();
    return () => { cancelled = true; };
  }, [tipo]);

  /* ---- Fetch noticias ---- */
  async function fetchNoticias(reset = false) {
    if (loading) return;
    setLoading(true);
    setLastErr("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const nextPage = reset ? 1 : page;

      if (tipo === "juridica") {
        const esc = mapAlias(especialidad);

        // (1) intento directo con especialidad (o todas)
        const params1 = {
          tipo: "juridica",
          page: nextPage,
          limit: PAGE_SIZE,
          lang: "es",
          ...(esc !== "todas" ? { especialidad: esc } : {}),
          // Si tienes agregadores múltiples en el backend, puedes forzar providers desde env:
          // providers: import.meta?.env?.PROVIDERS_JURIDICA || undefined,
          signal: controller.signal,
        };
        const qs1 = new URLSearchParams(
          Object.fromEntries(Object.entries(params1).filter(([, v]) => v != null && v !== ""))
        ).toString();
        setLastUrl(`${API_BASE}/noticias?${qs1}`);

        const resp1 = await getNoticiasRobust(params1);
        let base = Array.isArray(resp1?.items) ? resp1.items : [];

        // (2) si vacío y no es "todas": pedir jurídicas generales 21d y filtrar local
        if (base.length === 0 && esc !== "todas") {
          const resp2 = await getNoticiasRobust({
            tipo: "juridica",
            page: 1,
            limit: EXTENDED_LIMIT,
            lang: "es",
            sinceDays: 21,
            signal: controller.signal,
          });
          const pool = Array.isArray(resp2?.items) ? resp2.items : [];
          base = pool.filter((n) => {
            const bag = new Set(
              []
                .concat(n?.especialidades || [], n?.etiquetas || [], n?.tags || [])
                .map(mapAlias)
            );
            if (bag.has(esc)) return true;

            const texto = `${n?.titulo||""} ${n?.resumen||""} ${n?.fuente||n?.source||""} ${n?.categoria||""} ${n?.area||""}`;
            return matchEspecialidad(esc, texto);
          });
        }

        // (3) si “todas” y sigue vacío: ampliar a 7d
        if (base.length === 0 && esc === "todas") {
          const resp3 = await getNoticiasRobust({
            tipo: "juridica",
            page: 1,
            limit: EXTENDED_LIMIT,
            lang: "es",
            sinceDays: 7,
            signal: controller.signal,
          });
          base = Array.isArray(resp3?.items) ? resp3.items : [];
        }

        // Orden + dedupe + corte
        const mostradas = prioritizeLegis(base).slice(0, PAGE_SIZE);

        setItems((prev) => (reset ? mostradas : dedupeByKey([...prev, ...mostradas])));
        setPage(nextPage + 1);
        setHasMore(mostradas.length >= PAGE_SIZE);

        if (DEBUG_NEWS && reset) {
          console.log("[OV/JUR] esc=", especialidad, "| recibidas=", base.length, "| mostradas=", mostradas.length);
        }
        return;
      }

      /* -------- GENERALES -------- */
      const temaSlug = (tema || "").trim();
      const params = {
        tipo: "general",
        page: nextPage,
        limit: PAGE_SIZE,
        lang: "es",
        q: temaSlug || undefined, // en "todas" no se envía
        signal: controller.signal,
      };
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
      ).toString();
      setLastUrl(`${API_BASE}/noticias?${qs}`);

      const { items: nuevos, pagination } = await getNoticiasRobust(params);
      const baseGen = Array.isArray(nuevos) ? nuevos : [];

      setItems((prev) => (reset ? baseGen : dedupeByKey([...prev, ...baseGen])));
      setPage(nextPage + 1);

      if (pagination && typeof pagination.nextPage !== "undefined") {
        setHasMore(Boolean(pagination.nextPage));
      } else {
        setHasMore(baseGen.length >= PAGE_SIZE);
      }

      if (DEBUG_NEWS && reset) {
        console.log("[OV/GEN] tema=", tema || "(todas)", "| recibidas=", baseGen.length);
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
    const t = setTimeout(() => fetchNoticias(true), 60);
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
      const f = (n?.fuente || n?.source || "").toLowerCase();
      return t.includes(text) || r.includes(text) || f.includes(text);
    });
  }, [items, q]);

  /* ---- Lector ---- */
  const openReader = (n) => { setSel(n); setOpen(true); };
  const closeReader = () => { setOpen(false); setSel(null); };

  /* ======================= UI ======================= */
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
                  tipo === t.key ? "bg-[#b03a1a] text-white" : "bg-white text-[#b03a1a] border border-[#e7d4c8]"}
                `}
              >
                {t.label}
              </button>
            ))}
          </div>

          <h4 className="text-xs font-bold text-[#4a2e23] mb-2">Especialidades</h4>
          <div className="flex flex-col gap-2">
            {sortChips(chips).map((a) => (
              <button
                key={a}
                onClick={() => (tipo === "general" ? setTema(a === "todas" ? "" : a) : setEspecialidad(a))}
                className={chipClass(especialidad === a)}
              >
                {pretty(a)}
              </button>
            ))}
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
                  {sortChips(OTRAS).map((o) => (
                    <button
                      key={o}
                      onClick={() => setEspecialidad(o)}
                      className={chipClass(especialidad === o)}
                    >
                      {pretty(o)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="h-px bg-[#f1e5dc] my-3" />
          <h4 className="text-xs font-bold text-[#4a2e23] mb-2">Temas afines</h4>
          <div className="flex flex-wrap gap-2">
            {AFINES.map((t) => (
              <button key={t} onClick={() => setTema(t)} className={chipClass(tema === t)}>
                {pretty(t)}
              </button>
            ))}
            {tema && (
              <button
                onClick={() => setTema("")}
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#b03a1a] bg-white border border-[#e7d4c8]"
              >
                Limpiar tema
              </button>
            )}

            {DEBUG_NEWS && (
              <details className="w-full mt-2 text-[11px] text-[#6b4d3e]">
                <summary className="cursor-pointer">Diagnóstico</summary>
                <div className="mt-1 break-words">
                  <div><b>API_BASE:</b> {API_BASE}</div>
                  <div><b>URL:</b> {lastUrl || "—"}</div>
                  {lastErr && <div className="text-red-600"><b>Error:</b> {lastErr}</div>}
                </div>
              </details>
            )}
          </div>
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
                    tipo === t.key ? "bg-[#b03a1a] text-white" : "bg-white text-[#b03a1a] border border-[#e7d4c8]"}
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div id="chips-scroll" className="flex gap-2 overflow-x-auto no-scrollbar">
              {sortChips(chips).map((a) => (
                <button
                  key={a}
                  onClick={() => (tipo === "general" ? setTema(a === "todas" ? "" : a) : setEspecialidad(a))}
                  className={chipClass(especialidad === a)}
                >
                  {pretty(a)}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold text-[#4a2e23] shrink-0">Afines:</span>
              {AFINES.map((t) => (
                <button key={t} onClick={() => setTema(t)} className={chipClass(tema === t)}>
                  {pretty(t)}
                </button>
              ))}
              {tema && (
                <button
                  onClick={() => setTema("")}
                  className="px-3 py-1.5 rounded-full text-sm font-semibold text-[#b03a1a] bg-white border border-[#e7d4c8] shrink-0"
                >
                  Limpiar
                </button>
              )}
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

          {/* Barra de búsqueda desktop */}
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
                {Array.from({ length: Math.min(6, PAGE_SIZE) }).map((_, i) => (
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
                No hay noticias en esta especialidad.
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
                          {n.fecha && <time>{new Date(n.fecha).toLocaleDateString("es-PE")}</time>}
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

      {/* Lector unificado */}
      <ReaderModal open={open} item={sel} onClose={closeReader} />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
