// src/components/ui/NoticiasGeneralesModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { CHIP_MAP } from "@/constants/noticiasGeneralChips";

// --- Servicio de noticias: import tolerante a nombres ---
import * as newsClient from "@/services/noticiasClientService.js";
const getNews =
  newsClient.getNewsLive ||
  newsClient.getNoticiasRobust ||
  newsClient.getNoticias ||
  newsClient.getNoticiasLive ||
  newsClient.fetchNoticias ||
  null;

const clearNoticiasCache = newsClient.clearNoticiasCache || (() => {});
const proxifyMedia = newsClient.proxifyMedia || ((u) => u);
const API_BASE = newsClient.API_BASE || "/api";

// --- Lector de contenido de noticia ---
import { getContenidoNoticia } from "@/services/noticiasContenido.js";

const PAGE_SIZE = 10;
const ALLOWED_PROVIDERS = new Set([
  "reutersvideo", "apvideo", "euronews", "cnn", "bbc", "dw",
  "reuters", "ap", "nytimes", "guardian", "elpais", "elcomercio", "rpp",
  "gnews", "newsapi",
]);

const keyOf = (n, i) =>
  n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`;

export default function NoticiasGeneralesModal({
  open,
  onClose,
  initialLang = "all",
}) {
  // Filtros
  const [tema, setTema] = useState("actualidad");
  const [lang, setLang] = useState(initialLang);
  const [providersSel, setProvidersSel] = useState([]);

  // Lista y estado de carga
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Diagnóstico
  const [urlEfectiva, setUrlEfectiva] = useState("");
  const [lastErr, setLastErr] = useState("");
  const [forceReloadTick, setForceReloadTick] = useState(0);

  // Lector interno
  const [reader, setReader] = useState(null); // { title, url, html }

  const CHIPS = Object.keys(CHIP_MAP);
  const canLoad = useMemo(() => open && !loading && hasMore, [open, loading, hasMore]);

  // Focus trap + bloquear scroll body
  const shellRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (reader) setReader(null);
        else onClose?.();
      }
      if (e.key === "Tab") {
        const focusable = shellRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, reader]);

  useEffect(() => {
    if (open) console.debug("🔎 API_BASE =", API_BASE, "| origin =", window.location.origin);
  }, [open]);

  async function fetchPage(nextPage = 1, reset = false) {
    if (!open || loading) return;
    setLoading(true);
    setLastErr("");

    try {
      if (!getNews) throw new Error("Servicio de noticias no disponible (getNews). Revisa noticiasClientService.js");

      const conf = CHIP_MAP[tema] || { providers: [], q: "" };

      // merge + saneo de providers (lowercase + allowed)
      const mergedProviders = Array.from(new Set([
        ...(conf.providers || []),
        ...(providersSel || []),
      ].map(p => String(p).trim().toLowerCase()).filter(Boolean)))
        .filter(p => ALLOWED_PROVIDERS.has(p));

      const qParam = conf.q && conf.q.trim().length ? conf.q : undefined;
      const langParam = lang && lang !== "all" ? lang : undefined;

      // Para diagnóstico visual
      const qp = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        ...(qParam ? { q: qParam } : {}),
        ...(langParam ? { lang: langParam } : {}),
        ...(mergedProviders.length ? { providers: mergedProviders.join(",") } : {}),
      }).toString();
      setUrlEfectiva(`${API_BASE}/news?${qp}`);

      // Llamada real
      const { items: its = [], pagination = {} } = await getNews({
        page: nextPage,
        limit: PAGE_SIZE,
        q: qParam,
        lang: langParam,
        providers: mergedProviders,
      });

      // Merge sin duplicados
      const baseList = reset ? [] : items;
      const map = new Map(baseList.map((n, i) => [keyOf(n, i), n]));
      its.forEach((n, i) => map.set(keyOf(n, i), n));
      const merged = Array.from(map.values());

      // hasMore
      const backendNext = pagination?.nextPage ?? pagination?.hasMore;
      const inferNext = its.length === PAGE_SIZE ? nextPage + 1 : null;

      setItems(merged);
      setPage(pagination?.page || nextPage);
      setHasMore(Boolean(backendNext ?? inferNext));
    } catch (e) {
      console.error("NoticiasGeneralesModal.fetchPage:", e);
      setLastErr(e?.message || String(e));
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // primera carga + limpieza cuando cambian filtros
  useEffect(() => {
    if (!open) return;
    clearNoticiasCache();
    setReader(null);
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tema, lang, providersSel, forceReloadTick]);

  // Abrir lector interno
  const openReader = async (item) => {
    const url = item.enlace || item.url || item.link;
    if (!url) {
      setReader({
        title: item.titulo || item.title || "(Sin título)",
        url: null,
        html: `<p>No se encontró enlace para esta noticia.</p>`,
      });
      return;
    }
    try {
      setLoading(true);
      const data = await getContenidoNoticia({ url, full: true });
      const html = data?.html || `<p>⚠️ No se pudo extraer el contenido completo. Puedes abrir la fuente.</p>`;
      setReader({
        title: item.titulo || item.title || "(Sin título)",
        url,
        html,
      });
    } catch (err) {
      setReader({
        title: item.titulo || item.title || "(Sin título)",
        url,
        html: `<p>⚠️ Ocurrió un error al extraer el contenido. Abre la fuente para leerlo.</p>`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => (reader ? setReader(null) : onClose?.())} />

      {/* Shell del panel */}
      <aside
        ref={shellRef}
        className="relative ml-auto h-full w-full sm:max-w-[620px] bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (marrón degradado, texto blanco) */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white rounded-t-2xl sm:rounded-none"
          style={{
            background: "linear-gradient(90deg, #8B5E3C 0%, #A06B47 100%)",
            boxShadow: "0 2px 0 rgba(0,0,0,.06)",
          }}
        >
          <h3 className="font-bold text-lg">
            {reader ? (reader.title || "Noticia") : "Noticias"}
          </h3>
          <button onClick={() => (reader ? setReader(null) : onClose?.())} className="p-1 hover:bg-white/10 rounded-full" aria-label="Cerrar">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Lector interno */}
        {reader ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 prose max-w-none">
            {/* Controles lector */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setReader(null)}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                title="Volver al listado"
              >
                ← Volver
              </button>
              {reader.url && (
                <a
                  href={reader.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Ver fuente
                </a>
              )}
            </div>

            {/* Contenido extraído */}
            <div
              className="reader-html"
              dangerouslySetInnerHTML={{ __html: reader.html }}
            />

            {/* Estilo mínimo para el contenido del lector */}
            <style>{`
              .reader-html img { max-width: 100%; height: auto; border-radius: 8px; }
              .reader-html p { line-height: 1.7; margin: 0 0 1em 0; }
              .reader-html h1, .reader-html h2, .reader-html h3 { margin: 1em 0 .6em; }
              .reader-html blockquote { padding: .6em 1em; border-left: 3px solid #e6d9cf; background: #faf7f4; border-radius: 6px; }
              .reader-html a { color: #8B5E3C; text-decoration: underline; }
            `}</style>
          </div>
        ) : (
          <>
            {/* Controles */}
            <div className="px-4 py-3 border-b bg-white">
              {/* Chips de tema */}
              <div className="flex flex-wrap gap-2 mb-2">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTema((t) => (t === c ? "actualidad" : c))}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      tema === c ? "bg-[#8B5E3C] text-white border-[#8B5E3C]" : "bg-white hover:bg-gray-50"
                    }`}
                    title={
                      CHIP_MAP[c]?.providers?.length
                        ? `Fuentes: ${CHIP_MAP[c].providers.join(", ")}`
                        : "Sin filtro: feed amplio"
                    }
                  >
                    {c}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setTema("actualidad");
                    setLang("all");
                    setProvidersSel([]);
                    setForceReloadTick((n) => n + 1);
                  }}
                  className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-gray-50"
                >
                  Limpiar filtros
                </button>

                <button
                  onClick={() => setForceReloadTick((n) => n + 1)}
                  className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-gray-50"
                  title="Ignora caché y vuelve a cargar"
                >
                  Forzar recarga
                </button>
              </div>

              {/* Idioma */}
              <div className="flex items-center gap-2">
                <span className="text-sm">Idioma:</span>
                {["all", "es", "en"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      lang === l ? "bg-[#8B5E3C] text-white border-[#8B5E3C]" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {l === "all" ? "Todos" : l === "es" ? "Español" : "Inglés"}
                  </button>
                ))}
              </div>

              {/* Providers */}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Proveedores (prioridad multimedia)</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "elpais", "elcomercio", "rpp",
                    "bbc", "dw", "ap", "reuters",
                    "euronews", "cnn", "gnews", "newsapi",
                  ].map((p) => {
                    const key = p.toLowerCase();
                    const active = providersSel.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          setProvidersSel((arr) => (active ? arr.filter((x) => x !== key) : [...arr, key]))
                        }
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          active ? "bg-[#8B5E3C] text-white border-[#8B5E3C]" : "bg-white hover:bg-gray-50"
                        }`}
                        title={key}
                      >
                        {key}
                      </button>
                    );
                  })}
                  {!!providersSel.length && (
                    <button
                      onClick={() => setProvidersSel([])}
                      className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-gray-50"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </details>

              {/* Debug */}
              <details className="mt-3">
                <summary className="cursor-pointer text-sm">Diagnóstico</summary>
                <div className="mt-2 p-2 border rounded bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        clearNoticiasCache();
                        setForceReloadTick((n) => n + 1);
                      }}
                      className="px-2 py-1 border rounded text-xs hover:bg-white"
                    >
                      Limpiar caché + recargar
                    </button>
                    {urlEfectiva && (
                      <a
                        href={urlEfectiva.replace(/\s+\(.+\)$/, "")}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 border rounded text-xs hover:bg-white"
                      >
                        Abrir URL efectiva
                      </a>
                    )}
                  </div>
                  <small className="block mt-2 text-[11px] text-gray-600 break-all">
                    API_BASE: {API_BASE}<br />
                    URL: {urlEfectiva}<br />
                    items: {items.length}{lastErr ? ` | error: ${lastErr}` : ""}
                  </small>
                </div>
              </details>
            </div>

            {/* Lista (scroll interno) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
              {items.length === 0 && !loading && (
                <div className="text-sm text-gray-500 text-center py-8">
                  {lastErr ? "No se pudo cargar. Revisa el diagnóstico." : "Sin resultados con este filtro."}
                </div>
              )}

              {items.map((n, i) => (
                <article
                  key={keyOf(n, i)}
                  className="border rounded-lg p-3 hover:shadow transition cursor-pointer"
                  onClick={() => openReader(n)}
                  title="Leer aquí"
                >
                  <div className="font-semibold hover:underline">
                    {n.titulo || n.title || n.headline || "(Sin título)"}
                  </div>
                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                    {(n.fuente || n.source) && (
                      <span className="px-1.5 py-0.5 border rounded">
                        {n.fuente || n.source}
                      </span>
                    )}
                    {n.fecha && <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>}
                    {n.publishedAt && <span>{new Date(n.publishedAt).toLocaleDateString("es-PE")}</span>}
                  </div>
                  {(n.resumen || n.description || n.abstract || n.snippet || n.contenido) && (
                    <p className="text-sm mt-2 line-clamp-3">
                      {n.resumen || n.description || n.abstract || n.snippet || n.contenido}
                    </p>
                  )}
                  {/* Enlace explícito (sin detener el click principal) */}
                  { (n.enlace || n.url || n.link) && (
                    <a
                      href={n.enlace || n.url || n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-[12px] underline text-[#8B5E3C]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver fuente
                    </a>
                  )}
                </article>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-1">
                  <button
                    disabled={!canLoad}
                    onClick={() => fetchPage(page + 1)}
                    className="px-4 py-2 rounded-lg bg-[#8B5E3C] text-white font-semibold disabled:opacity-50 hover:opacity-90"
                  >
                    {loading ? "Cargando…" : "Cargar más"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* estilos scrollbars */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
