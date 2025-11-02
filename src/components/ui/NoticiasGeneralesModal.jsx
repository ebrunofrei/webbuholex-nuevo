/* eslint-disable react/no-danger */
// src/components/ui/NoticiasGeneralesModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { CHIP_MAP } from "@/constants/noticiasGeneralChips";
import {
  API_BASE,
  getNoticiasRobust as getNewsLive,
  proxifyMedia,
  clearNoticiasCache,
} from "@/services/noticiasClientService.js";
import { getContenidoNoticia } from "@/services/noticiasContenido.js";

/* ----------------------------- Config ----------------------------- */
const PAGE_SIZE = 10;
const FALLBACK_IMG = "/assets/default-news.jpg";
const ALLOWED_PROVIDERS = new Set([
  "reutersvideo", "apvideo", "euronews", "cnn", "bbc", "dw",
  "reuters", "ap", "nytimes", "guardian", "elpais", "elcomercio", "rpp",
  "gnews", "newsapi",
]);

/* ----------------------------- Utils ------------------------------ */
const isHttp = (u) => /^https?:\/\//i.test(String(u || ""));
const keyOf = (n, i) =>
  n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`;

const b64 = (s = "") => {
  try { return window.btoa(unescape(encodeURIComponent(String(s)))); } catch { return ""; }
};
const cacheGet = (k) => { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const cacheSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };

const isBadImg = (u = "") =>
  !u || /bullet\.gif|placeholder|default|noimage|transparent|spacer/i.test(u) || /^data:image\/gif/i.test(u);

async function getOgImage(url, { signal } = {}) {
  try {
    if (!isHttp(url)) return "";
    const res = await fetch(`/api/media/meta?url=${encodeURIComponent(url)}`, {
      signal, headers: { accept: "application/json" },
    });
    if (!res.ok) return "";
    const j = await res.json().catch(() => ({}));
    return j?.ogImage || "";
  } catch { return ""; }
}

const stripHtml = (html = "") => {
  const div = document.createElement("div"); div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
};

const htmlFromPlain = (text = "") =>
  `<p>${String(text || "")
    .split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean)
    .map((p) => p.replace(/\n/g, " "))
    .join("</p><p>")}</p>`;

/* =================== Modal con Lector Integrado =================== */
export default function NoticiasGeneralesModal({ open, onClose, initialLang = "all" }) {
  const [tema, setTema] = useState("actualidad");
  const [lang, setLang] = useState(initialLang);
  const [providersSel, setProvidersSel] = useState([]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Debug
  const [urlEfectiva, setUrlEfectiva] = useState("");
  const [lastErr, setLastErr] = useState("");
  const [forceReloadTick, setForceReloadTick] = useState(0);

  const CHIPS = Object.keys(CHIP_MAP);
  const canLoad = useMemo(() => open && !loading && hasMore, [open, loading, hasMore]);

  // focus trap + bloquear scroll body
  const shellRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyH = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab") {
        const qs = shellRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!qs?.length) return;
        const first = qs[0], last = qs[qs.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", keyH);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", keyH); };
  }, [open, onClose]);

  /* --------------------- Cargar lista de noticias --------------------- */
  async function fetchPage(nextPage = 1, reset = false) {
    if (!open || loading) return;
    setLoading(true); setLastErr("");

    try {
      const conf = CHIP_MAP[tema] || { providers: [], q: "" };

      const mergedProviders = Array.from(
        new Set([...(conf.providers || []), ...(providersSel || [])]
          .map((p) => String(p).trim().toLowerCase())
          .filter(Boolean))
      ).filter((p) => ALLOWED_PROVIDERS.has(p));

      const qParam = conf.q?.trim() ? conf.q : undefined;
      const langParam = lang !== "all" ? lang : undefined;

      const qp = new URLSearchParams({
        page: String(nextPage), limit: String(PAGE_SIZE),
        ...(qParam ? { q: qParam } : {}),
        ...(langParam ? { lang: langParam } : {}),
        ...(mergedProviders.length ? { providers: mergedProviders.join(",") } : {}),
      }).toString();
      setUrlEfectiva(`${API_BASE}/news?${qp}`);

      const { items: its, pagination } = await getNewsLive({
        page: nextPage, limit: PAGE_SIZE, q: qParam, lang: langParam, providers: mergedProviders,
      });

      const base = reset ? [] : items;
      const map = new Map(base.map((n, i) => [keyOf(n, i), n]));
      its.forEach((n, i) => map.set(keyOf(n, i), n));
      const merged = Array.from(map.values());

      const backendNext = pagination?.nextPage ?? pagination?.hasMore;
      const inferNext = its.length === PAGE_SIZE ? nextPage + 1 : null;

      setItems(merged);
      setPage(pagination?.page || nextPage);
      setHasMore(Boolean(backendNext ?? inferNext));
    } catch (e) {
      setLastErr(e?.message || String(e));
      setHasMore(false);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!open) return;
    clearNoticiasCache();
    setItems([]); setPage(1); setHasMore(true);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tema, lang, providersSel, forceReloadTick]);

  /* ---------------------- Lector integrado robusto --------------------- */
  const [reader, setReader] = useState({
    open: false, url: "", title: "", html: "",
    meta: { imagen: "", fuente: "", fecha: null }, loading: false, font: 100,
  });
  const contentAbortRef = useRef(null);

  function normalizeExtract(payload = {}, fallbackPlain = "") {
    // Acepta variantes {html|bodyHtml|content|texto}
    const rawHtml =
      payload.bodyHtml || payload.html || payload.content || payload.texto || "";
    const finalHtml = rawHtml?.trim()
      ? rawHtml
      : (fallbackPlain ? htmlFromPlain(fallbackPlain) : "");
    return {
      title: payload.title || payload.titulo || "",
      bodyHtml: finalHtml,
      imagen: payload.imagen || payload.image || "",
      fuente: payload.fuente || payload.source || "",
      fecha: payload.fecha || payload.publishedAt || null,
    };
  }

  async function openReader(n) {
    const url = n?.enlace || n?.url || n?.link || "";
    if (!isHttp(url)) return;

    const baseMeta = {
      imagen: n.imagen || n.image || n.urlToImage || "",
      fuente: n.fuente || n.source?.name || "",
      fecha: n.fecha || n.publishedAt || null,
    };
    const fallbackPlain =
      n.contenido || n.resumen || n.description || n.abstract || n.snippet || "";

    setReader({
      open: true,
      url,
      title: n.titulo || n.title || n.headline || "Sin título",
      html: fallbackPlain ? htmlFromPlain(fallbackPlain) : "",
      meta: baseMeta,
      loading: true,
      font: 100,
    });

    if (contentAbortRef.current) contentAbortRef.current.abort();
    contentAbortRef.current = new AbortController();

    const cacheKey = `news:${b64(url).slice(0, 32)}`;
    let extracted = cacheGet(cacheKey);

    try {
      if (!extracted) {
        // 1) GET normal
        extracted = await getContenidoNoticia({ url, lang: "es", full: 1, signal: contentAbortRef.current.signal });

        // 2) si viene vacío, POST/AGGRESSIVE
        if (!extracted || !stripHtml(extracted.bodyHtml || extracted.html || "")) {
          try {
            const retry = await getContenidoNoticia({
              url, lang: "es", full: 1, mode: "aggressive", method: "POST",
              signal: contentAbortRef.current.signal,
            });
            if (retry) extracted = retry;
          } catch {}
        }
        cacheSet(cacheKey, extracted);
      }

      const norm = normalizeExtract(extracted || {}, fallbackPlain);

      // Imagen final (og:image si la existente es mala)
      let img = norm.imagen || baseMeta.imagen || "";
      if (isBadImg(img)) {
        const og = await getOgImage(url, { signal: contentAbortRef.current.signal });
        if (og) img = og;
      }

      // Fallback DURÍSIMO: iframe sandbox cuando sigue vacío
      const finalHtml = norm.bodyHtml?.trim()
        ? norm.bodyHtml
        : `
          <p><em>No pudimos extraer el artículo con seguridad.</em></p>
          <p>Intentaremos mostrarlo aquí mismo:</p>
          <iframe
            src="${url}"
            loading="lazy"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer"
            style="width:100%;height:70vh;border:1px solid #eee;border-radius:8px"
          ></iframe>
          <p class="mt-3">
            Si el medio bloquea la vista embebida,
            <a href="${url}" target="_blank" rel="noreferrer" class="underline text-[#b03a1a]">abre la fuente</a>.
          </p>`.trim();

      setReader((r) => ({
        ...r,
        title: norm.title || r.title,
        html: finalHtml,
        meta: {
          imagen: img || FALLBACK_IMG,
          fuente: norm.fuente || baseMeta.fuente,
          fecha: norm.fecha || baseMeta.fecha,
        },
        loading: false,
      }));
    } catch {
      // también cae al iframe
      setReader((r) => ({
        ...r,
        html: r.html || `
          <p><em>Sin contenido para previsualizar.</em></p>
          <p><a href="${url}" target="_blank" rel="noreferrer" class="underline text-[#b03a1a]">Abrir fuente</a></p>`,
        loading: false,
      }));
    }
  }

  function closeReader() {
    if (contentAbortRef.current) contentAbortRef.current.abort();
    setReader((r) => ({ ...r, open: false }));
  }

  /* --------------------------- Render --------------------------- */
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <aside
        ref={shellRef}
        className="relative ml-auto h-full w-full sm:max-w-[560px] bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#b03a1a] to-[#e1683a] text-white rounded-t-2xl sm:rounded-none">
          <h3 className="font-bold text-lg">Noticias</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full" aria-label="Cerrar">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* filtros */}
        <div className="px-4 py-3 border-b bg-white">
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.keys(CHIP_MAP).map((c) => (
              <button
                key={c}
                onClick={() => setTema((t) => (t === c ? "actualidad" : c))}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  tema === c ? "bg-[#b03a1a] text-white border-[#b03a1a]" : "bg-white hover:bg-gray-50"
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
              onClick={() => { setTema("actualidad"); setLang("all"); setProvidersSel([]); setForceReloadTick((n) => n + 1); }}
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

          <div className="flex items-center gap-2">
            <span className="text-sm">Idioma:</span>
            {["all", "es", "en"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${
                  lang === l ? "bg-[#b03a1a] text-white border-[#b03a1a]" : "bg-white hover:bg-gray-50"
                }`}
              >
                {l === "all" ? "Todos" : l === "es" ? "Español" : "Inglés"}
              </button>
            ))}
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-sm">Proveedores (prioridad multimedia)</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {["elpais","elcomercio","rpp","bbc","dw","ap","reuters","euronews","cnn","gnews","newsapi"].map((p) => {
                const k = p.toLowerCase(); const active = providersSel.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() => setProvidersSel((arr) => (active ? arr.filter((x) => x !== k) : [...arr, k]))}
                    className={`px-3 py-1.5 rounded-full border text-sm transition ${
                      active ? "bg-[#b03a1a] text-white border-[#b03a1a]" : "bg-white hover:bg-gray-50"
                    }`}
                    title={k}
                  >
                    {k}
                  </button>
                );
              })}
              {!!providersSel.length && (
                <button onClick={() => setProvidersSel([])} className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-gray-50">
                  Limpiar
                </button>
              )}
            </div>
          </details>

          {/* debug */}
          <div className="mt-3 p-2 border rounded bg-gray-50">
            <small className="block text-[11px] text-gray-600 break-all">
              API_BASE: {API_BASE}<br />
              URL: {urlEfectiva}<br />
              items: {items.length}{lastErr ? ` | error: ${lastErr}` : ""}
            </small>
          </div>
        </div>

        {/* lista */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
          {items.length === 0 && !loading && (
            <div className="text-sm text-gray-500 text-center py-8">Sin resultados con este filtro.</div>
          )}

          {items.map((n, i) => (
            <article
              key={keyOf(n, i)}
              className="border rounded-lg p-3 hover:shadow transition cursor-pointer"
              onClick={() => openReader(n)}
              title="Abrir lector"
            >
              <div className="font-semibold hover:underline">
                {n.titulo || n.title || n.headline || "(Sin título)"}
              </div>
              <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                {(n.fuente || n.source) && <span className="px-1.5 py-0.5 border rounded">{n.fuente || n.source}</span>}
                {n.fecha && <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>}
                {n.publishedAt && <span>{new Date(n.publishedAt).toLocaleDateString("es-PE")}</span>}
              </div>
              {(n.resumen || n.description || n.abstract || n.snippet || n.contenido) && (
                <p className="text-sm mt-2 line-clamp-3">
                  {n.resumen || n.description || n.abstract || n.snippet || n.contenido}
                </p>
              )}
            </article>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                disabled={!canLoad}
                onClick={() => fetchPage(page + 1)}
                className="px-4 py-2 rounded-lg bg-[#b03a1a] text-white font-semibold disabled:opacity-50 hover:bg-[#a63a1e]"
              >
                {loading ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* lector */}
      {reader.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-2 sm:px-4" role="dialog" aria-modal="true" onClick={closeReader}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[96vw] sm:max-w-5xl lg:max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-[#b03a1a] to-[#e1683a] text-white">
              <h3 className="flex-1 font-extrabold text-lg sm:text-2xl leading-tight line-clamp-2">{reader.title}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setReader((r) => ({ ...r, font: Math.max(80, r.font - 10) }))} className="p-2 rounded-md bg-white/10 hover:bg-white/20" title="Reducir">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => setReader((r) => ({ ...r, font: Math.min(180, r.font + 10) }))} className="p-2 rounded-md bg-white/10 hover:bg-white/20" title="Ampliar">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={closeReader} className="ml-1 p-2 rounded-md bg-white/10 hover:bg-white/20" title="Cerrar" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 no-scrollbar">
              <div className="text-xs text-[#6b4d3e] flex flex-wrap gap-3 mb-3">
                {reader.meta.fuente && <span>Fuente: <b>{reader.meta.fuente}</b></span>}
                {reader.meta.fecha && <span>{new Date(reader.meta.fecha).toLocaleString("es-PE")}</span>}
              </div>

              {reader.meta.imagen && (
                <img
                  src={proxifyMedia(reader.meta.imagen)}
                  alt={reader.title}
                  className="w-full object-cover rounded-lg max-h-[46vh] bg-[#f6f2ee] mb-4"
                  onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                />
              )}

              {reader.loading ? (
                <p className="text-gray-500 text-base sm:text-lg">Extrayendo contenido…</p>
              ) : (
                <div
                  className="prose max-w-none prose-p:my-4 prose-img:w-full prose-img:rounded-md leading-8 sm:leading-9"
                  style={{ fontSize: `${reader.font}%` }}
                  dangerouslySetInnerHTML={{ __html: reader.html }}
                />
              )}

              {reader.url && (
                <p className="mt-4">
                  <a href={reader.url} target="_blank" rel="noreferrer" className="underline text-[#b03a1a]">Ver fuente</a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
