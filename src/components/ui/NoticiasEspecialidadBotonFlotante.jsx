// ============================================================
// 🦉 BúhoLex | Botón flotante — Noticias JURÍDICAS por especialidad (refactor PRO)
// - Forzado a tipo="juridica"
// - Filtra SOLO por "especialidad" (NO sirve para generales)
// - Estrategia por intentos:
//   1) providers (legis/tc/pj) + sinceDays=2
//   2) providers (legis/tc/pj) + sinceDays=7
//   3) solo providers
//   4) solo especialidad (sin providers)
//   5) fallback q por especialidad
//   6) feed jurídico amplio → filtrado local por especialidad
// - Deduplicación por id/enlace/url/título
// - Scroll infinito dentro del panel
// - Cache ligera via getNoticiasRobust (sessionStorage)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Scale, X } from "lucide-react";
import {
  getNoticiasRobust,
  clearNoticiasCache,
  API_BASE,
} from "@/services/noticiasClientService.js";

// ================== Config ==================
const PAGE_SIZE = 8;
const PROVIDERS_PRIOR = ["legis.pe", "poder judicial", "tribunal constitucional", "tc"];

// 🔎 Keywords por especialidad (para filtrado local y heurísticas)
const ES_KEYWORDS = {
  penal: [
    "penal","delito","presunto","acusado","imputado","denuncia","fiscal","ministerio público","mp",
    "juzgado penal","pena","prisión","prision","prisión preventiva","sentencia penal","condena",
    "homicidio","robo","hurto","lesiones","violación","estafa","lavado de activos"
  ],
  civil: [
    "civil","propiedad","dominio","posesión","posesion","prescripción adquisitiva","contrato","obligaciones",
    "daños y perjuicios","indemnización","arrendamiento","inquilino","copropiedad","servidumbre"
  ],
  laboral: [
    "laboral","trabajador","empleador","remuneración","cts","gratificación","hostigamiento","acoso laboral",
    "desnaturalización","despido","reposición","sindicato","sunafil","jornada","horas extras","descanso"
  ],
  constitucional: [
    "constitucional","tribunal constitucional","tc","amparo","hábeas corpus","habeas corpus","hábeas data","habeas data",
    "control difuso","inconstitucionalidad","derechos fundamentales","derechos humanos"
  ],
  familiar: [
    "familia","alimentos","tenencia","patria potestad","régimen de visitas","regimen de visitas",
    "filiación","divorcio","separación","violencia familiar","pensión de alimentos"
  ],
  administrativo: [
    "administrativo","procedimiento administrativo","tupa","plazo perentorio","acto administrativo",
    "sancionador","expediente","recurso de apelación","nulidad de oficio","silencio administrativo"
  ],
  comercial: [
    "comercial","societario","empresa","constitución de empresa","sociedad anónima","sac",
    "quiebra","concurso","reestructuración","indecopi","título valor","factoring"
  ],
  tributario: [
    "tributario","sunat","impuesto","igv","impuesto a la renta","renta","detracciones","percepciones",
    "fiscalización","fiscalizacion","reclamación","apelación","tribunal fiscal"
  ],
  procesal: [
    "procesal","proceso","procedimiento","tutela","medida cautelar","apelación","casación","competencia",
    "cosa juzgada","inimpugnabilidad","nulidad procesal","actuación probatoria"
  ],
  registral: [
    "registral","sunarp","registro","partida registral","asiento registral","inmatriculación","rectificación de partida",
    "publicidad registral","título inscribible","observación registral"
  ],
  ambiental: [
    "ambiental","oefa","mina","minería","impacto ambiental","eia","licencia ambiental","pasivos ambientales",
    "deforestación","contaminación","evaluación ambiental"
  ],
  notarial: [
    "notarial","notario","notaría","escritura pública","legalización de firmas","acta notarial",
    "protesto","minuta","transferencia de propiedad","sucesión intestada"
  ],
  penitenciario: [
    "penitenciario","inpe","cárcel","carcel","penitenciaría","prisión","penal","beneficios penitenciarios",
    "semilibertad","liberación condicional","redención de pena","tratamiento penitenciario"
  ],
  consumidor: [
    "consumidor","indecopi","protección al consumidor","cláusulas abusivas","idoneidad","garantía","libro de reclamaciones",
    "publicidad engañosa","defensa del consumidor","información veraz"
  ],
  "seguridad social": [
    "seguridad social","essalud","onp","afp","pensión","jubilación","devengo","cálculo de pensión","retiro afp",
    "aportaciones","régimen pensionario","spp","snps"
  ],
  // Ocasionales (si tienes chips extra):
  "derechos humanos": [
    "derechos humanos","cidh","onu","corte idh","convención americana","convencion americana","derecho internacional de los derechos humanos"
  ],
  internacional: [
    "internacional","extradición","extradicion","cooperación judicial","cancillería","embajada","tratado","jurisdicción universal"
  ],
};

const norm = (s) =>
  (s ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const mapAlias = (s) => {
  const t = norm(s);
  const alias = {
    tc: "constitucional",
    "tribunal constitucional": "constitucional",
    procedimiento: "procesal",
    proceso: "procesal",
    registrales: "registral",
    registral: "registral",
    "seguridadsocial": "seguridad social",
  };
  return alias[t] || t;
};

const keyOf = (n, i) =>
  n._id ||
  n.id ||
  n.enlace ||
  n.url ||
  n.link ||
  `${n.titulo || n.title || "item"}#${n.fecha || n.publishedAt || ""}#${i}`;

// ================== Componente ==================
export default function NoticiasEspecialidadBotonFlotante({
  especialidad = "civil",   // penal | civil | laboral | ...
  lang = "all",             // es | en | all
  titulo = "Noticias jurídicas",
}) {
  const [open, setOpen] = useState(false);

  // listado
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // indicador de nuevas
  const [hayNuevas, setHayNuevas] = useState(false);

  // diagnóstico
  const [lastErr, setLastErr] = useState("");
  const [lastUrl, setLastUrl] = useState("");
  const [profile, setProfile] = useState("");

  const boxRef = useRef(null);

  const esc = useMemo(() => mapAlias(especialidad || "todas"), [especialidad]);
  const kw = useMemo(() => (ES_KEYWORDS[esc] || []).join(" "), [esc]);

  // ---------- Loader con intentos escalonados ----------
  async function fetchNoticias(nextPage = 1) {
    if (loading) return;
    setLoading(true);
    setLastErr("");
    setProfile("");

    const baseParams = {
      tipo: "juridica",
      page: nextPage,
      limit: PAGE_SIZE,
      lang: lang && lang !== "all" ? lang : undefined,
      especialidad: esc && esc !== "todas" ? esc : undefined,
    };

    // Intentos (más estricto → laxo)
    const attempts = [];

    // providers priorizados (legis / PJ / TC)
    const providersCsv = PROVIDERS_PRIOR.join(",");
    attempts.push({
      note: "providers+sinceDays=2",
      params: { ...baseParams, providers: providersCsv, sinceDays: 2 },
    });
    attempts.push({
      note: "providers+sinceDays=7",
      params: { ...baseParams, providers: providersCsv, sinceDays: 7 },
    });
    attempts.push({
      note: "solo providers",
      params: { ...baseParams, providers: providersCsv },
    });

    // solo especialidad
    attempts.push({
      note: "solo especialidad (7d)",
      params: { ...baseParams, especialidad: esc !== "todas" ? toApiSlug(esc) : undefined, sinceDays: 7 }
    });

    // fallback con q ~ especialidad (si hubiese)
    if (kw) {
      attempts.push({
        note: "fallback q por especialidad",
        params: { ...baseParams, providers: providersCsv, q: kw, useQ: 1 },
      });
      attempts.push({
        note: "fallback q sin providers",
        params: { ...baseParams, providers: undefined, q: kw, useQ: 1 },
      });
    }

    // último recurso: feed jurídico amplio y filtrar en cliente
    attempts.push({
      note: "juridicas amplias → filtro local",
      params: { tipo: "juridica", page: nextPage, limit: PAGE_SIZE },
      filterLocal: true,
    });

    const dedupe = new Map();
    let chosen = "";
    let effectiveUrl = "";

    for (const a of attempts) {
      try {
        const qs = new URLSearchParams(
          Object.entries(a.params).reduce((acc, [k, v]) => {
            if (v !== undefined && v !== null && v !== "") acc[k] = String(v);
            return acc;
          }, {})
        ).toString();
        effectiveUrl = `${API_BASE}/noticias?${qs}`;
        setLastUrl(effectiveUrl);

        const { items: nuevos = [], pagination = {} } = await getNoticiasRobust(a.params);

        let arr = Array.isArray(nuevos) ? nuevos : [];

        // Filtro local por especialidad si corresponde
        if (a.filterLocal && esc && esc !== "todas") {
          const tagMatch = (n) => {
            const bag = new Set([
              ...(n?.especialidades || []),
              n?.categoria || "",
              n?.area || "",
            ].map(mapAlias));
            return bag.has(esc);
          };
          const textoMatch = (n) => {
            const t = `${n?.titulo || ""} ${n?.resumen || ""} ${n?.fuente || ""}`.toLowerCase();
            const kws = ES_KEYWORDS[esc] || [];
            return kws.some((k) => t.includes(k.toLowerCase()));
          };
          arr = arr.filter((n) => tagMatch(n) || textoMatch(n));
        }

        for (let i = 0; i < arr.length; i++) {
          const k = keyOf(arr[i], i);
          if (!dedupe.has(k)) dedupe.set(k, arr[i]);
        }

        if (arr.length > 0) {
          chosen = a.note;
          // merge & paginación
          const prevList = nextPage === 1 ? [] : items;
          const prevKeys = new Set(prevList.map((n, i) => keyOf(n, i)));
          const merged = [...prevList];
          Array.from(dedupe.values()).forEach((n, i) => {
            const k = keyOf(n, i);
            if (!prevKeys.has(k)) merged.push(n);
          });

        // setear estados finales
          setItems(merged);
          setPage(pagination?.page || nextPage);
          setHasMore(Boolean(pagination?.nextPage) || arr.length >= PAGE_SIZE);
          setProfile(chosen);
          setLoading(false);
          return;
        }
      } catch (err) {
        // siguiente intento
        chosen = `${a.note} (error)`;
        setProfile(chosen);
        setLastErr((prev) => prev || err?.message || String(err));
      }
    }

    // si llegamos aquí, no hubo resultados en ningún intento
    setHasMore(false);
    setProfile(chosen || "sin resultados");
    setLoading(false);
  }

  // primera carga + cuando cambian filtros
  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    clearNoticiasCache?.();
    fetchNoticias(1);
    setHayNuevas(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esc, lang]);

  // scroll infinito dentro del panel
  useEffect(() => {
    if (!open) return;
    const el = boxRef.current;
    if (!el) return;

    const onScroll = () => {
      if (loading || !hasMore) return;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      if (nearBottom) fetchNoticias(page + 1);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, page, hasMore, loading]);

  const handleOpen = () => {
    setOpen(true);
    setHayNuevas(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <div
        className="fixed z-[80] bottom-24 left-1/2 -translate-x-1/2
                   md:left-auto md:right-6 md:bottom-24 md:translate-x-0
                   flex justify-center w-full md:w-auto pointer-events-none"
      >
        <button
          onClick={handleOpen}
          className="pointer-events-auto flex items-center gap-2 px-5 py-3
                     rounded-full shadow-2xl bg-[#6d4a28] text-white font-bold text-lg
                     hover:bg-[#52351e] transition active:scale-95 relative"
          title={`${titulo} — ${especialidad}`}
        >
          <Scale size={22} className={hayNuevas ? "animate-bell" : ""} />
          <span className="hidden sm:inline">Jurídicas</span>
          {hayNuevas && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-yellow-400 animate-ping" />
          )}
        </button>
      </div>

      {/* Panel lateral */}
      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside
            className="relative ml-auto w-full max-w-[360px] h-full bg-white shadow-2xl
                       border-l-4 border-[#6d4a28] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#6d4a28]/10">
              <h2 className="font-bold text-[#6d4a28] text-lg">
                {titulo} — <span className="capitalize">{especialidad}</span>
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:opacity-70"
                title="Cerrar"
              >
                <X className="w-6 h-6 text-[#6d4a28]" />
              </button>
            </div>

            <div
              ref={boxRef}
              className="p-3 overflow-y-auto flex-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#6d4a28 #f7e4d5" }}
            >
              {items.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-6">
                  {lastErr ? "No se pudo cargar. Revisa más tarde." : "Sin noticias."}
                </div>
              )}

              {items.map((n, idx) => (
                <article key={keyOf(n, idx)} className="mb-3">
                  <div className="bg-[#faf9f6] rounded-xl p-3 shadow-md border border-[#e0d6c8] hover:shadow-lg transition">
                    <div className="flex items-center mb-2">
                      <span className="text-xs bg-[#6d4a28]/80 text-white px-2 py-0.5 rounded-full font-medium mr-2">
                        {n.fuente || "Fuente"}
                      </span>
                      <span className="ml-auto text-[11px] text-[#6d4a28] opacity-70">
                        {n.fecha ? new Date(n.fecha).toLocaleDateString("es-PE") : ""}
                      </span>
                    </div>

                    <a
                      href={n.enlace || n.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-bold text-[#6d4a28] text-[15px] leading-snug hover:underline hover:text-[#52351e] transition"
                      style={{ wordBreak: "break-word" }}
                    >
                      {n.titulo || n.title || "(Sin título)"}
                    </a>

                    {(n.resumen || n.description) && (
                      <p className="mt-1 text-sm text-[#3a2a20] opacity-85 line-clamp-3">
                        {n.resumen || n.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}

              {loading && <div className="text-center text-[#6d4a28] py-3">Cargando…</div>}

              {!hasMore && items.length > 0 && (
                <div className="text-center text-xs text-[#bbb] py-2">No hay más noticias.</div>
              )}
            </div>

            {/* Diagnóstico opcional */}
            <div className="px-3 py-2 border-t bg-[#faf7f4] text-[11px] text-[#7b5c47]">
              <div className="truncate">
                <b>API_BASE:</b> {API_BASE} &nbsp;|&nbsp; <b>URL:</b> {lastUrl || "—"} &nbsp;|&nbsp; <b>perfil:</b> {profile || "—"}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Estilos locales (sin fugar a global) */}
      <style>{`
        .animate-bell { animation: bell-shake 1s infinite cubic-bezier(.36,.07,.19,.97); }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg); }
          15% { transform: rotate(-20deg); }
          30% { transform: rotate(15deg); }
          45% { transform: rotate(-10deg); }
          60% { transform: rotate(10deg); }
          75% { transform: rotate(-5deg); }
        }
      `}</style>
    </>
  );
}
