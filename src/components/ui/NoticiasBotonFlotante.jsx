/* eslint-disable react/no-danger */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReaderModal from "./ReaderModal.jsx";

import {
  Megaphone,
  X,
  Globe2,
  Minus,
  Plus,
  ChevronsUp,
  ChevronsDown,
  Copy,
  Volume2,
} from "lucide-react";
import { Link } from "react-router-dom";

// Servicio unificado (lista + utils + API_BASE)
import {
  API_BASE,
  getNoticiasRobust,
  proxifyMedia,
  clearNoticiasCache,
} from "@services/noticiasClientService.js";

// Extracción de contenido completo (GET/POST robusto + sanitizado)
import { getContenidoNoticia } from "@services/noticiasContenido.js";

// Traducción
import { traducirTexto } from "@services/traducir.js";

/* ----------------------- Config ----------------------- */
const PAGE_SIZE = 8;

const TOPICS = [
  { es: "política", en: "politics" },
  { es: "economía", en: "economy" },
  { es: "corrupción", en: "corruption" },
  { es: "ciencia", en: "science" },
  { es: "tecnología", en: "technology" },
  { es: "sociedad", en: "society" },
];

const LANG_CHIPS = [
  { key: "all", label: "Todos" },
  { key: "es", label: "Español" },
  { key: "en", label: "Inglés" },
];

const PROVIDERS_PRIORITY = [
  "bbc",
  "cnn",
  "dw",
  "euronews",
  "reutersVideo",
  "apVideo",
  "reuters",
  "ap",
  "nytimes",
  "guardian",
  "elpais",
  "elcomercio",
  "rpp",
  "gnews",
  "newsapi",
];

// Imagen por defecto
const FALLBACK_IMG = "/assets/default-news.jpg";

/* ----------------------- Utils ----------------------- */
const hasWindow = typeof window !== "undefined";

// Cache de sesión (memoria) con TTL
const localCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const cacheKey = (params) =>
  JSON.stringify({
    t: params?.tipo,
    p: params?.page,
    l: params?.limit,
    q: params?.q || "",
    lang: params?.lang || "",
    prov: params?.providers || [],
  });

const b64 = (s) => {
  try {
    if (!hasWindow) return "";
    return window.btoa(unescape(encodeURIComponent(String(s))));
  } catch {
    return "";
  }
};

const cacheGet = (k) => {
  try {
    if (!hasWindow) return null;
    const v = sessionStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const cacheSet = (k, v) => {
  try {
    if (!hasWindow) return;
    sessionStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const topicQueryValue = (t) => {
  const f = TOPICS.find((x) => x.es === t || x.en === t);
  return f ? `${f.es},${f.en}` : t || "";
};

const detectLang = (text = "") => {
  const T = (text || "").toLowerCase();
  if (!T.trim()) return "unknown";
  const es =
    (T.match(/[áéíóúñ¡¿]| el | la | de | que | los | las | para | con | del /g) || [])
      .length;
  const en =
    (T.match(/ the | of | and | to | in | is | for | on | with | by /g) || []).length;
  if (es === 0 && en === 0) return "unknown";
  return es >= en ? "es" : "en";
};

const stripHtml = (html = "") => {
  try {
    const div = hasWindow ? document.createElement("div") : null;
    if (!div) return String(html || "");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  } catch {
    return String(html || "");
  }
};

const htmlFromPlain = (text = "") =>
  `<p>${String(text || "")
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.replace(/\n/g, " "))
    .join("</p><p>")}</p>`;

function completenessScore(n) {
  const hasText = Boolean(
    n?.resumen || n?.description || n?.abstract || n?.snippet || n?.contenido
  );
  const hasMedia = Boolean(
    n?.imagen ||
      n?.image ||
      n?.video ||
      n?.videoUrl ||
      (n?.media && /video|image/i.test(String(n.media)))
  );
  if (hasText && hasMedia) return 3;
  if (hasText) return 2;
  if (hasMedia) return 1;
  return 0;
}
function dateMs(n) {
  const d = new Date(
    n?.fecha || n?.pubDate || n?.publishedAt || n?.date || 0
  ).getTime();
  return Number.isFinite(d) ? d : 0;
}
function sortPrioritizingCompleteness(arr = [], prioritize = true) {
  if (!prioritize) return [...arr].sort((a, b) => dateMs(b) - dateMs(a));
  return [...arr].sort((a, b) => {
    const cs = completenessScore(b) - completenessScore(a);
    if (cs !== 0) return cs;
    const dt = dateMs(b) - dateMs(a);
    if (dt !== 0) return dt;
    return String(b.id || b._id || b.url || b.enlace || "").localeCompare(
      String(a.id || a._id || a.url || a.enlace || "")
    );
  });
}

function toYouTubeThumb(url) {
  try {
    const u = new URL(url);
    if (/youtu\.be/i.test(u.hostname)) {
      const id = u.pathname.slice(1);
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
    }
    if (/youtube\.com/i.test(u.hostname)) {
      const id = u.searchParams.get("v");
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
    }
  } catch {}
  return null;
}

function mediaSrcSmart(n) {
  let url = n?.imagen || n?.image || "";
  if (!url && (n?.videoUrl || /youtu(be\.com|\.be)/i.test(n?.link || ""))) {
    url = toYouTubeThumb(n.videoUrl || n.link) || "";
  }
  if (!url) return FALLBACK_IMG;
  if (/^\/(assets|uploads)\//i.test(url)) return url; // local
  if (/^https?:\/\//i.test(url)) return proxifyMedia(url); // remoto via /api/media
  return FALLBACK_IMG;
}

/* ----------------------- Scroll lock hook ----------------------- */
function useScrollLock(locked) {
  useEffect(() => {
    if (!hasWindow) return;
    const docEl = document.documentElement;
    const body = document.body;
    if (!locked) {
      body.style.overflow = "";
      docEl.style.overflow = "";
      body.style.paddingRight = "";
      return;
    }
    const hasVScroll = window.innerWidth > docEl.clientWidth;
    const scrollBar = hasVScroll ? window.innerWidth - docEl.clientWidth : 0;
    body.style.paddingRight = scrollBar ? `${scrollBar}px` : "";
    body.style.overflow = "hidden";
    docEl.style.overflow = "hidden";
    return () => {
      body.style.overflow = "";
      docEl.style.overflow = "";
      body.style.paddingRight = "";
    };
  }, [locked]);
}

/* ======================= Componente ======================= */
export default function NoticiasBotonFlotante({ titulo = "Noticias" }) {
  const [open, setOpen] = useState(false); // panel lateral
  const [modal, setModal] = useState(null); // lector

  useScrollLock(open || Boolean(modal));

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [topic, setTopic] = useState(null);
  const [feedLang, setFeedLang] = useState("all");
  const [providers, setProviders] = useState([]);
  const [prioritizeComplete, setPrioritizeComplete] = useState(true);

  const [loadingContent, setLoadingContent] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [fontScale, setFontScale] = useState(100);
  const [lastUrl, setLastUrl] = useState("");
  const [lastErr, setLastErr] = useState("");

  const readerRef = useRef(null);

  // TTS
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtterance = useRef(null);

  // Aborters
  const listAbortRef = useRef(null);
  const contentAbortRef = useRef(null);
  const translateAbortRef = useRef(null);

  // Secuenciador para evitar respuestas fuera de orden
  const reqSeqRef = useRef(0);
  const lastAppliedSeqRef = useRef(0);

  const normalizedProviders = useMemo(
    () =>
      (Array.isArray(providers) ? providers : [])
        .map((p) => String(p).trim().toLowerCase())
        .filter(Boolean),
    [providers]
  );

  const fetchNoticias = useCallback(
    async (
      nextPage = 1,
      pTopic = topic,
      pLang = feedLang,
      pProviders = normalizedProviders,
      forceNoCache = false
    ) => {
      // Nueva secuencia
      const mySeq = ++reqSeqRef.current;

      // Cancela solicitud previa
      if (listAbortRef.current) listAbortRef.current.abort();
      const ac = new AbortController();
      listAbortRef.current = ac;

      // Arma params
      const baseParams = {
        tipo: "general",
        page: nextPage,
        limit: PAGE_SIZE,
        q: pTopic ? topicQueryValue(pTopic) : undefined,
        lang: pLang === "all" ? undefined : pLang,
        providers: pProviders.length ? pProviders : undefined,
        noCache: forceNoCache,
        signal: ac.signal,
      };

      // Cache buster solo cuando fuerza
      const params = { ...baseParams, cb: forceNoCache ? Date.now() : undefined };

      // Diagnóstico
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) => v !== undefined && v !== null && v !== "" && v !== false
          )
        )
      ).toString();
      setLastUrl(`${API_BASE}/noticias?${qs}`);
      setLastErr("");

      // Cache de memoria (no vaciamos mientras recarga)
      const lcKey = cacheKey(params);
      const hit = localCache.get(lcKey);
      if (hit && Date.now() - (hit.ts || 0) < CACHE_TTL_MS && nextPage === 1) {
        setItems(hit.items || []);
        setHasMore(Boolean(hit.hasMore));
      }

      setLoading(true);

      // helper de reintento
      const attempt = async (tries = 2) => {
        let lastErrLocal;
        for (let i = 0; i < tries; i += 1) {
          try {
            const resp = await getNoticiasRobust(params);
            return resp;
          } catch (e) {
            if (e?.name === "AbortError") throw e;
            lastErrLocal = e;
            await new Promise((r) => setTimeout(r, i === 0 ? 300 : 700));
          }
        }
        throw lastErrLocal;
      };

      try {
        const resp = await attempt(2);

        // Descartar si no es la respuesta vigente
        if (mySeq < reqSeqRef.current) return;

        let list = Array.isArray(resp?.items) ? resp.items : [];
        list = list.map((n) => ({ ...n, __hasUrl: Boolean(n?.url || n?.enlace || n?.link) }));
        const ordered = sortPrioritizingCompleteness(list, prioritizeComplete);

        if (nextPage === 1) setItems(ordered);
        else
          setItems((prev) =>
            sortPrioritizingCompleteness([...prev, ...ordered], prioritizeComplete)
          );

        const more =
          Boolean(resp?.pagination?.hasMore) || (Array.isArray(list) && list.length === PAGE_SIZE);
        setHasMore(more);
        setPage(nextPage);

        // Cache memoria
        localCache.set(lcKey, { ts: Date.now(), items: ordered, hasMore: more });

        lastAppliedSeqRef.current = mySeq;
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (mySeq >= reqSeqRef.current) {
          console.error("Error cargando noticias:", err);
          setLastErr(err?.message || String(err));
          // Mantener items previos; solo cortamos el hasMore
          setHasMore(false);
        }
      } finally {
        if (mySeq >= reqSeqRef.current) setLoading(false);
      }
    },
    [topic, feedLang, normalizedProviders, prioritizeComplete]
  );

  // primera carga
  useEffect(() => {
    clearNoticiasCache();
    fetchNoticias(1, null, "all", [], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarTema = (t) => {
    setTopic(t);
    setPage(1);
    setHasMore(true);
    fetchNoticias(1, t, feedLang, normalizedProviders, true);
  };
  const aplicarIdioma = (langKey) => {
    setFeedLang(langKey);
    setPage(1);
    setHasMore(true);
    fetchNoticias(1, topic, langKey, normalizedProviders, true);
  };

  const toggleProvider = (prov) => {
    setProviders((prev) => {
      const out = prev.includes(prov) ? prev.filter((p) => p !== prov) : [...prev, prov];
      setPage(1);
      setHasMore(true);
      fetchNoticias(1, topic, feedLang, out, true);
      return out;
    });
  };

  const togglePrioritizeComplete = () => {
    const newVal = !prioritizeComplete;
    setPrioritizeComplete(newVal);
    setItems((prev) => sortPrioritizingCompleteness(prev, newVal));
  };

  const limpiarFiltros = () => {
    setTopic(null);
    setFeedLang("all");
    setProviders([]);
    setPrioritizeComplete(true);
    setPage(1);
    setHasMore(true);
    fetchNoticias(1, null, "all", [], true);
  };

  const recargar = () => fetchNoticias(1, topic, feedLang, normalizedProviders, true);

  /* ----------------------- Lector ----------------------- */
  const stopSpeaking = () => {
    try {
      if (!hasWindow) return;
      window.speechSynthesis.cancel();
      if (currentUtterance.current) currentUtterance.current.onend = null;
    } catch {}
    setIsSpeaking(false);
    currentUtterance.current = null;
  };

  useEffect(
    () => () => {
      // cleanup al desmontar
      if (listAbortRef.current) listAbortRef.current.abort();
      if (contentAbortRef.current) contentAbortRef.current.abort();
      if (translateAbortRef.current) translateAbortRef.current.abort();
      stopSpeaking();
    },
    []
  );

  const openReader = async (n) => {
    const articleUrl = n?.url || n?.enlace || n?.link || "";
    if (!articleUrl) return;

    setFontScale(100);
    stopSpeaking();

    const fallbackPlain =
      n.resumen || n.description || n.abstract || n.snippet || n.contenido || "";

    setModal({
      url: articleUrl,
      titleOriginal: n.titulo || n.title || n.headline || "Sin título",
      titleTranslated: "",
      bodyHtmlOriginal: fallbackPlain ? htmlFromPlain(fallbackPlain) : "",
      bodyHtmlTranslated: "",
      showTranslated: false,
    });

    // abortar extracción previa
    if (contentAbortRef.current) contentAbortRef.current.abort();
    contentAbortRef.current = new AbortController();

    setLoadingContent(true);
    const key = `news:${b64(articleUrl).slice(0, 32)}`;
    let extracted = cacheGet(key);

    try {
      if (!extracted) {
        // 1) intento normal
        extracted = await getContenidoNoticia({
          url: articleUrl,
          lang: "es",
          full: 1,
          signal: contentAbortRef.current.signal,
        });

        // 2) reintento agresivo si vino vacío
        if (!extracted?.bodyHtml?.trim()) {
          try {
            const retry = await getContenidoNoticia({
              url: articleUrl,
              lang: "es",
              full: 1,
              mode: "aggressive",
              signal: contentAbortRef.current.signal,
            });
            if (retry?.bodyHtml?.trim()) extracted = retry;
          } catch {}
        }

        cacheSet(key, extracted);
      }

      const titleOrig = extracted?.title || n.titulo || n.title || "Sin título";

      const htmlOrig = (() => {
        if (extracted?.bodyHtml?.trim()) return extracted.bodyHtml;
        if (fallbackPlain) return htmlFromPlain(fallbackPlain);
        // 3) fallback: iframe en sandbox
        return `
          <p><em>No pudimos extraer el artículo con seguridad.</em></p>
          <p>Intentaremos mostrarlo aquí mismo:</p>
          <iframe
            src="${articleUrl}"
            loading="lazy"
            sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerpolicy="no-referrer"
            style="width:100%;height:70vh;border:1px solid #eee;border-radius:8px"
          ></iframe>
          <p class="mt-3">
            Si el medio bloquea la vista embebida,
            <a href="${articleUrl}" target="_blank" rel="noreferrer" class="underline text-[#b03a1a]">abre la fuente</a>.
          </p>`;
      })();

      setModal((m) => (m ? { ...m, titleOriginal: titleOrig, bodyHtmlOriginal: htmlOrig } : m));
    } catch (e) {
      if (e?.name === "AbortError") return;
      const htmlOrig = fallbackPlain
        ? htmlFromPlain(fallbackPlain)
        : `<p><em>Sin contenido para previsualizar.</em> Abre la fuente para leer la noticia.</p>`;
      setModal((m) => (m ? { ...m, bodyHtmlOriginal: htmlOrig } : m));
    } finally {
      setLoadingContent(false);
    }

    // Traducción condicionada
    try {
      if (translateAbortRef.current) translateAbortRef.current.abort();
      translateAbortRef.current = new AbortController();

      const titleToCheck = (extracted?.title || n.titulo || n.title || "").toString();
      const plainForLang = stripHtml(extracted?.bodyHtml || "") || fallbackPlain;
      const needs =
        detectLang(titleToCheck) !== "es" || detectLang(plainForLang) !== "es";
      if (!needs) {
        setModal((m) => (m ? { ...m, showTranslated: false } : m));
        return;
      }

      setTranslating(true);
      const [tTitle, tBody] = await Promise.all([
        traducirTexto(titleToCheck, "es", { signal: translateAbortRef.current.signal }),
        traducirTexto(plainForLang.slice(0, 24000), "es", {
          signal: translateAbortRef.current.signal,
        }),
      ]);

      setModal((m) =>
        m
          ? {
              ...m,
              titleTranslated: tTitle || "",
              bodyHtmlTranslated: tBody ? htmlFromPlain(tBody) : "",
              showTranslated: Boolean(tTitle || tBody),
            }
          : m
      );
    } catch (e) {
      if (e?.name !== "AbortError") console.warn("Traducción falló:", e?.message || e);
    } finally {
      setTranslating(false);
    }
  };

  const speakToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    try {
      if (!hasWindow) return;
      const html =
        modal?.showTranslated && modal?.bodyHtmlTranslated
          ? modal.bodyHtmlTranslated
          : modal?.bodyHtmlOriginal || "";
      const txt = `${
        modal?.showTranslated && modal?.titleTranslated
          ? modal.titleTranslated
          : modal?.titleOriginal
      }. ${stripHtml(html)}`.slice(0, 28000);

      if (!txt.trim()) return;

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt);
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => /es-|spanish/i.test(v.lang));
      if (esVoice) u.voice = esVoice;
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onend = () => stopSpeaking();
      currentUtterance.current = u;
      setIsSpeaking(true);
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const copyAll = async () => {
    try {
      const html =
        modal?.showTranslated && modal?.bodyHtmlTranslated
          ? modal.bodyHtmlTranslated
          : modal?.bodyHtmlOriginal || "";
    const txt = stripHtml(html);
      await navigator.clipboard.writeText(txt);
      alert("Texto copiado al portapapeles.");
    } catch {
      alert("No se pudo copiar.");
    }
  };

  const bodyHtmlToShow = modal
    ? modal.showTranslated && modal.bodyHtmlTranslated
      ? modal.bodyHtmlTranslated
      : modal.bodyHtmlOriginal
    : "";

  /* ----------------------- UI ----------------------- */
  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-full px-5 py-3 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white text-lg font-semibold shadow-lg"
        aria-label="Abrir noticias"
      >
        <Megaphone className="w-6 h-6" />
        <span className="hidden sm:inline">{titulo}</span>
      </button>

      {/* Panel lateral */}
      {open && (
        <div className="fixed inset-0 z-[70] flex" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative ml-auto w-full sm:w-[560px] h-full bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-red-700 to-red-500 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-none">
              <h3 className="font-bold text-xl">{titulo}</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full"
                title="Cerrar panel"
                aria-label="Cerrar panel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filtros */}
            <div className="px-4 py-2 border-b bg-white space-y-2">
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((k) => (
                  <button
                    key={k.es}
                    onClick={() => aplicarTema(k.es)}
                    className={`text-sm px-3 py-1 rounded-full border transition ${
                      topic === k.es
                        ? "bg-red-600 text-white border-red-600"
                        : "hover:bg-gray-100"
                    }`}
                    aria-pressed={topic === k.es}
                  >
                    {k.es}
                  </button>
                ))}
                {topic && (
                  <button
                    onClick={limpiarFiltros}
                    className="text-sm px-3 py-1 rounded-full border hover:bg-gray-100"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  onClick={recargar}
                  className="text-sm px-3 py-1 rounded-full border hover:bg-gray-100"
                >
                  Forzar recarga
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-1">Idioma:</span>
                  {LANG_CHIPS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => aplicarIdioma(c.key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        feedLang === c.key
                          ? "bg-red-600 text-white border-red-600"
                          : "hover:bg-gray-100"
                      }`}
                      aria-pressed={feedLang === c.key}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    className="accent-red-600"
                    checked={prioritizeComplete}
                    onChange={togglePrioritizeComplete}
                  />
                  Solo artículos completos <b>(priorizar)</b>
                </label>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-600 select-none">
                  Proveedores (prioridad multimedia)
                </summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {PROVIDERS_PRIORITY.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleProvider(p)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        providers.includes(p)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "hover:bg-gray-100"
                      }`}
                      title={p}
                      aria-pressed={providers.includes(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </details>

              {/* Diagnóstico / Error */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-500 select-none">
                  Diagnóstico
                </summary>
                <div className="mt-2 text-[11px] text-gray-600 space-y-1 break-words">
                  <div>
                    <b>API_BASE:</b> {API_BASE}
                  </div>
                  <div>
                    <b>URL:</b> {lastUrl || "—"}
                  </div>
                </div>
              </details>

              {lastErr && !loading && (
                <div className="mx-1 mt-2 mb-1 p-3 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700">
                  <div className="font-semibold mb-1">No se pudo cargar noticias.</div>
                  <div className="opacity-80 break-words mb-2">{String(lastErr)}</div>
                  <button
                    onClick={() => recargar()}
                    className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 text-xs font-semibold"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[17px] leading-relaxed">
              {items.length === 0 && !loading && (
                <p className="text-gray-500 text-center mt-6">Sin resultados.</p>
              )}

              <div className="grid grid-cols-1 gap-3">
                {items.map((n, idx) => {
                  const hasUrl = Boolean(n.__hasUrl);
                  const handleClick = () => {
                    if (hasUrl) openReader(n);
                  };
                  return (
                    <article
                      key={n.id || n._id || n.enlace || n.url || idx}
                      onClick={handleClick}
                      className={`border rounded-xl overflow-hidden bg-white transition ${
                        hasUrl
                          ? "hover:shadow-lg cursor-pointer"
                          : "opacity-80 cursor-not-allowed"
                      }`}
                      title={hasUrl ? "Abrir lector" : "Este ítem no trae enlace de fuente"}
                    >
                      {(n.video || n.videoUrl) && (
                        <div className="px-3 pt-3">
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-black text-white">
                            VIDEO
                          </span>
                        </div>
                      )}

                      {(n.imagen || n.image || n.videoUrl) && (
                        <div className="relative h-48">
                          <img
                            src={mediaSrcSmart(n)}
                            alt={n.titulo || "Noticia"}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                          <span className="absolute bottom-2 left-2 text-white text-xs px-2 py-1 bg-black/40 rounded">
                            {n.fuente || n.source || "Fuente"}
                          </span>
                          {!hasUrl && (
                            <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-black font-semibold">
                              Sin enlace
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-4">
                        <h4 className="font-bold text-lg sm:text-xl line-clamp-2">
                          {n.titulo || n.title || n.headline || "(Sin título)"}
                        </h4>
                        {(n.resumen ||
                          n.description ||
                          n.abstract ||
                          n.snippet ||
                          n.contenido) && (
                          <p className="text-gray-700 text-base sm:text-lg line-clamp-3 mt-2">
                            {n.resumen ||
                              n.description ||
                              n.abstract ||
                              n.snippet ||
                              n.contenido}
                          </p>
                        )}
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-2">
                          {n.fecha && (
                            <span>{new Date(n.fecha).toLocaleDateString("es-PE")}</span>
                          )}
                          {n.publishedAt && (
                            <span>
                              {new Date(n.publishedAt).toLocaleDateString("es-PE")}
                            </span>
                          )}
                          {!hasUrl && (
                            <span className="px-1.5 py-0.5 border rounded">demo/mock</span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {loading && (
                <p className="text-center text-base text-gray-500 py-4">Cargando…</p>
              )}

              {hasMore && !loading && (
                <div className="pt-2 pb-4 flex justify-center">
                  <button
                    onClick={() => fetchNoticias(page + 1)}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                  >
                    Cargar más
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-3 text-sm text-gray-600 border-t bg-white">
              ¿Buscas <b>noticias jurídicas</b>? Entra a la{" "}
              <Link
                to="/oficinaVirtual/noticias"
                onClick={() => setOpen(false)}
                className="text-red-600 underline font-semibold"
              >
                Oficina Virtual
              </Link>
              .
            </div>
          </aside>

          {/* Lector (integrado visualmente pero puedes cambiar por <ReaderModal /> si prefieres) */}
          {modal && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center px-2 sm:px-4"
              role="dialog"
              aria-modal="true"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  stopSpeaking();
                  setModal(null);
                }
              }}
            >
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => {
                  stopSpeaking();
                  setModal(null);
                }}
              />
              <div
                className="relative w-full max-w-[96vw] sm:max-w-5xl lg:max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-red-700 to-red-500 text-white">
                  <h3 className="flex-1 font-extrabold text-lg sm:text-2xl leading-tight line-clamp-2">
                    {modal.showTranslated && modal.titleTranslated
                      ? modal.titleTranslated
                      : modal.titleOriginal}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFontScale((v) => Math.max(80, v - 10))}
                      className="p-2 rounded-md bg-white/10 hover:bg-white/20"
                      title="Reducir"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setFontScale((v) => Math.min(180, v + 10))}
                      className="p-2 rounded-md bg-white/10 hover:bg-white/20"
                      title="Ampliar"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {(modal.titleTranslated || modal.bodyHtmlTranslated) && (
                      <button
                        onClick={() =>
                          setModal((m) => (m ? { ...m, showTranslated: !m.showTranslated } : m))
                        }
                        className="ml-1 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-xs sm:text-sm inline-flex items-center gap-2"
                        title={modal.showTranslated ? "Ver original" : "Ver en español"}
                      >
                        <Globe2 className="w-4 h-4" />{" "}
                        {modal.showTranslated ? "Original" : "Español"}
                      </button>
                    )}
                    <button
                      onClick={copyAll}
                      className="ml-1 p-2 rounded-md bg-white/10 hover:bg-white/20"
                      title="Copiar texto"
                      aria-label="Copiar texto"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={speakToggle}
                      className={`ml-1 p-2 rounded-md ${
                        isSpeaking ? "bg-white/20" : "bg-white/10 hover:bg-white/20"
                      }`}
                      title={isSpeaking ? "Silenciar" : "Leer en voz alta"}
                      aria-pressed={isSpeaking}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        stopSpeaking();
                        setModal(null);
                      }}
                      className="ml-1 p-2 rounded-md bg-white/10 hover:bg-white/20"
                      title="Cerrar lector"
                      aria-label="Cerrar lector"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div
                  ref={readerRef}
                  className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 no-scrollbar"
                >
                  {loadingContent ? (
                    <p className="text-gray-500 text-base sm:text-lg">Cargando contenido…</p>
                  ) : bodyHtmlToShow ? (
                    <div
                      className="prose max-w-none prose-p:my-4 prose-img:w-full prose-img:rounded-md leading-8 sm:leading-9"
                      style={{ fontSize: `${fontScale}%` }}
                      dangerouslySetInnerHTML={{ __html: bodyHtmlToShow }}
                    />
                  ) : (
                    <p className="text-gray-500">Sin contenido.</p>
                  )}

                  {modal?.url && (
                    <p className="mt-4">
                      <a
                        href={modal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-[#b03a1a]"
                      >
                        Ver fuente
                      </a>
                    </p>
                  )}

                  {translating && (
                    <p className="mt-3 text-sm sm:text-base text-gray-500">Traduciendo…</p>
                  )}
                </div>

                <div className="px-4 sm:px-6 py-3 border-t text-xs sm:text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => readerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
                      className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      <ChevronsUp className="w-4 h-4" /> Arriba
                    </button>
                    <button
                      onClick={() =>
                        readerRef.current?.scrollTo({
                          top: readerRef.current.scrollHeight,
                          behavior: "smooth",
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      <ChevronsDown className="w-4 h-4" /> Abajo
                    </button>
                  </div>

                  <div className="sm:ml-auto flex flex-wrap items-center gap-2">
                    {modal && (modal.titleTranslated || modal.bodyHtmlTranslated) && (
                      <button
                        className="underline text-[#b03a1a]"
                        onClick={() =>
                          setModal((m) => (m ? { ...m, showTranslated: !m.showTranslated } : m))
                        }
                      >
                        {modal.showTranslated
                          ? "Mostrando texto en español — ver original"
                          : "Mostrando texto original — ver en español"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scrollbars suaves */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: #e6d9cf; border-radius: 8px; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </>
  );
}
