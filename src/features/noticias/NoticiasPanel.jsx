// ============================================================
// 🦉 BúhoLex | Noticias Generales (Panel + Lector con TTS)
// - Carga noticias generales desde backend (paginadas, cacheadas)
// - Lector scrollable con voz (TTS) español-PE
// - Responsive 100% móvil/tablet/desktop
// - Evita loops, memory leaks y errores destroy()
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as newsClient from "@/services/noticiasClientService.js";
import { getContenidoNoticia } from "@/services/noticiasContenido.js";

/* ------------------ Servicio canónico con fallbacks ------------------ */
const getGeneralNews =
  newsClient.getGeneralNews ||
  newsClient.getNoticiasRobust ||
  newsClient.getNoticias ||
  null;

const clearNoticiasCache = newsClient.clearNoticiasCache || (() => {});
const proxify = newsClient.proxifyMedia || ((u) => u);

/* ------------------ Utilidades ------------------ */
const norm = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const keyOf = (n, i) =>
  n.enlace ||
  n.url ||
  n.link ||
  n.id ||
  n._id ||
  `${(n.titulo || n.title || "item").slice(0, 80)}|${n.fuente || n.source || "src"}|${
    n.fecha || n.publishedAt || ""
  }|#${i}`;

const isHttp = (u) => /^https?:\/\//i.test(String(u || ""));
const firstImage = (n = {}) =>
  n.imagen ||
  n.image ||
  n.urlToImage ||
  (Array.isArray(n.multimedia) && n.multimedia[0]?.url) ||
  (Array.isArray(n.media) && (n.media[0]?.url || n.media[0]?.src)) ||
  "";

/* ------------------ Anti-ads mínimo ------------------ */
const ADS_BLOCK = [
  /\bapuesta(s)?\b/i,
  /\bbet\b/i,
  /\bcasino\b/i,
  /\bpron(ó|o)stico(s)?\b/i,
  /\bstream(ing)?\b/i,
  /\ben vivo\b/i,
  /\bd(o|ó)nde ver\b/i,
  /\bver online\b/i,
  /\blive\b/i,
];
const textOf = (n = {}) =>
  norm(
    `${n.titulo || n.title || ""} ${
      n.resumen || n.description || n.abstract || n.snippet || ""
    }`
  );
const softFilter = (items = []) =>
  items.filter((n) => !ADS_BLOCK.some((re) => re.test(textOf(n))));

/* ------------------ TTS helpers ------------------ */
const sanitizeForTTS = (htmlOrText = "") =>
  String(htmlOrText)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, " ")
    .replace(/\b(?!(?:19|20)\d{2}\b)\d{1,3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const chunkText = (text, size = 1700) => {
  const out = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const dot = Math.max(text.lastIndexOf(".", end), text.lastIndexOf(";", end));
    if (dot > i + 200) end = dot + 1;
    out.push(text.slice(i, end).trim());
    i = end;
  }
  return out.filter(Boolean);
};

/* ============================================================ */
/* 📰 Componente Principal */
/* ============================================================ */
export default function NoticiasPanel() {
  // Estado principal
  const [openPanel, setOpenPanel] = useState(false);
  const [openReader, setOpenReader] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastErr, setLastErr] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lang] = useState("es");

  // Refs
  const abortRef = useRef(null);
  const reqSeqRef = useRef(0);
  const itemsRef = useRef(items);
  const pageRef = useRef(page);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // TTS y lector
  const synthRef = useRef(
    typeof window !== "undefined" ? window.speechSynthesis : null
  );
  const [ttsState, setTtsState] = useState({
    status: "idle",
    idx: 0,
    chunks: [],
  });
  const currentUttRef = useRef(null);
  const [reader, setReader] = useState({
    title: "",
    html: "",
    url: "",
    raw: null,
  });

  useEffect(() => {
    try {
      synthRef.current?.getVoices();
    } catch {}
  }, []);

  /* ------------------ Fetch GENERAL ------------------ */
  const fetchNoticias = useCallback(
    async (mode = "reset") => {
      if (!getGeneralNews) return;

      if (mode === "reset") {
        abortRef.current?.abort?.();
        abortRef.current = new AbortController();
        reqSeqRef.current += 1;
        setLoading(true);
        setItems([]);
        setPage(1);
        setHasMore(true);
        setLastErr("");
        clearNoticiasCache?.();
      } else {
        if (!abortRef.current) abortRef.current = new AbortController();
        setLoadingMore(true);
      }

      const controller = abortRef.current;
      const mySeq = reqSeqRef.current;
      const nextPage = mode === "reset" ? 1 : pageRef.current + 1;
      const limit = 25;

      const base = {
        tipo: "general",
        page: nextPage,
        limit,
        lang,
        signal: controller.signal,
      };
      const attempts = [
        { params: { ...base, sinceDays: 2 } },
        { params: { ...base, q: "actualidad OR 'última hora' OR breaking", sinceDays: 7 } },
        { params: { ...base } },
      ];

      const seed =
        mode === "reset"
          ? []
          : itemsRef.current.map((it, i) => [keyOf(it, i), it]);
      const dedupe = new Map(seed);
      let got = [];
      let metaHasMore;

      for (const a of attempts) {
        try {
          const resp = await getGeneralNews(a.params);
          const arr = Array.isArray(resp?.items) ? resp.items : [];
          got = arr;
          metaHasMore = resp?.pagination?.hasMore;
          arr.forEach((it, i) => {
            const k = keyOf(it, i);
            if (!dedupe.has(k)) dedupe.set(k, it);
          });
          if (arr.length) break;
        } catch (e) {
          setLastErr((prev) => prev || e?.message || String(e));
        }
      }

      if (controller.signal.aborted || mySeq !== reqSeqRef.current) return;

      const merged = Array.from(dedupe.values());
      const filtered = softFilter(merged);
      setItems(filtered);

      if (mode === "reset") {
        setLoading(false);
        setPage(1);
      } else {
        setLoadingMore(false);
        setPage((p) => p + 1);
      }

      const computedHasMore =
        typeof metaHasMore === "boolean" ? metaHasMore : got.length >= limit;
      setHasMore(computedHasMore);
    },
    [lang]
  );

  // Cargar al abrir
  useEffect(() => {
    if (openPanel) fetchNoticias("reset");
  }, [openPanel, fetchNoticias]);

  /* ------------------ TTS Control ------------------ */
  const stopTTS = useCallback(
    (resetIdx = true) => {
      try {
        synthRef.current?.cancel?.();
      } catch {}
      currentUttRef.current = null;
      setTtsState((s) => ({
        status: "idle",
        idx: resetIdx ? 0 : s.idx,
        chunks: resetIdx ? [] : s.chunks,
      }));
    },
    []
  );

  useEffect(() => {
    if (!openPanel) stopTTS(true);
  }, [openPanel, stopTTS]);

  useEffect(() => {
    if (!openReader) stopTTS(true);
  }, [openReader, stopTTS]);

  // Cleanup global
  useEffect(() => {
    return () => {
      abortRef.current?.abort?.();
      stopTTS(true);
    };
  }, [stopTTS]);

  const startTTS = useCallback((text) => {
    const chunks = chunkText(sanitizeForTTS(text));
    if (!chunks.length) return;
    setTtsState({ status: "playing", idx: 0, chunks });
  }, []);

  const speakFrom = useCallback(
    (index) => {
      const { chunks } = ttsState;
      if (!chunks.length || index >= chunks.length) {
        stopTTS(true);
        return;
      }
      const utt = new SpeechSynthesisUtterance(chunks[index]);
      // Preferimos es-PE; si el navegador no lo soporta, voice resolverá el idioma base
      utt.lang = "es-PE";
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.onend = () => setTtsState((s) => ({ ...s, idx: s.idx + 1 }));
      utt.onerror = () => setTtsState((s) => ({ ...s, idx: s.idx + 1 }));
      currentUttRef.current = utt;
      try {
        synthRef.current?.speak?.(utt);
      } catch {
        // Fallback silencioso
      }
    },
    [ttsState, stopTTS]
  );

  useEffect(() => {
    if (ttsState.status !== "playing") return;
    if (!synthRef.current?.speaking && !synthRef.current?.paused)
      speakFrom(ttsState.idx);
  }, [ttsState.status, ttsState.idx, speakFrom]);

  const handleTogglePlayPause = () => {
    if (!reader.html && !reader.raw) return;
    if (ttsState.status === "idle") {
      const plain =
        sanitizeForTTS(`${reader.title || ""}. ${reader.html || ""}`) ||
        sanitizeForTTS(reader.raw?.resumen || reader.raw?.description || "");
      if (!plain) return;
      startTTS(plain);
      return;
    }
    if (ttsState.status === "playing") {
      try {
        synthRef.current?.pause?.();
      } catch {}
      setTtsState((s) => ({ ...s, status: "paused" }));
      return;
    }
    if (ttsState.status === "paused") {
      try {
        synthRef.current?.resume?.();
      } catch {}
      setTtsState((s) => ({ ...s, status: "playing" }));
    }
  };

  const handleRestart = () => {
    const plain =
      sanitizeForTTS(`${reader.title || ""}. ${reader.html || ""}`) ||
      sanitizeForTTS(reader.raw?.resumen || reader.raw?.description || "");
    if (!plain) return;
    stopTTS(true);
    setTimeout(() => startTTS(plain), 10);
  };

  const openReaderFor = async (n) => {
    try {
      setReader({
        title: n.titulo || n.title || "",
        html: "<p>Cargando…</p>",
        url: n.enlace || n.url || n.link,
        raw: n,
      });
      setOpenReader(true);

      const url = n.enlace || n.url || n.link;
      if (!url) {
        setReader((r) => ({ ...r, html: "<p>No hay enlace disponible.</p>" }));
        return;
      }
      const { contenido, html } = await getContenidoNoticia({ url, full: true });
      setReader((r) => ({
        ...r,
        html: contenido || html || "<p>Sin contenido.</p>",
      }));
      stopTTS(true);
    } catch {
      setReader((r) => ({
        ...r,
        html: `<p style="color:#a33">No se pudo cargar el contenido.</p>`,
      }));
      stopTTS(true);
    }
  };

  /* ------------------ UI ------------------ */
  return (
    <>
      {/* FAB */}
      <button className="nx-fab" onClick={() => setOpenPanel(true)}>
        📰 Noticias
      </button>

      {/* Panel lateral */}
      {openPanel && (
        <div className="nx-overlay" onClick={() => setOpenPanel(false)}>
          <aside
            className="nx-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nx-panel-head">
              <h3>Noticias Generales</h3>
              <div className="nx-head-actions">
                <button
                  className="nx-ghost"
                  onClick={() => fetchNoticias("reset")}
                  title="Recargar"
                >
                  ↻
                </button>
                <button
                  className="nx-ghost"
                  onClick={() => setOpenPanel(false)}
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="nx-list">
              {lastErr && !loading && items.length === 0 && (
                <div className="nx-error">
                  {String(lastErr || "Error al cargar noticias.")}
                </div>
              )}

              {loading && (
                <div className="nx-info">Cargando noticias…</div>
              )}

              {!loading &&
                items.map((n, i) => {
                  const id = keyOf(n, i);
                  const rawImg = firstImage(n);
                  const img = rawImg ? proxify(rawImg) : "";
                  return (
                    <article
                      key={id}
                      className="nx-card nx-card-vert"
                      onClick={() => openReaderFor(n)}
                    >
                      {img && <img src={img} alt="" loading="lazy" />}
                      <h3 className="nx-title">
                        {n.titulo || n.title || "(Sin título)"}
                      </h3>
                      {(n.resumen || n.description) && (
                        <p className="nx-desc">
                          {n.resumen || n.description}
                        </p>
                      )}
                      <div className="nx-meta">
                        <span>{n.fuente || n.source || ""}</span>
                        <span>
                          {n.fecha
                            ? new Date(n.fecha).toLocaleDateString("es-PE")
                            : n.publishedAt
                            ? new Date(n.publishedAt).toLocaleDateString(
                                "es-PE"
                              )
                            : ""}
                        </span>
                      </div>
                    </article>
                  );
                })}

              {!loading && hasMore && (
                <div className="nx-more">
                  <button
                    onClick={() => fetchNoticias("more")}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Buscando…" : "Ver más"}
                  </button>
                </div>
              )}

              {!loading && !hasMore && items.length > 0 && (
                <div className="nx-done">No hay más resultados.</div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Lector */}
      {openReader && (
        <div className="nx-reader-overlay" onClick={() => setOpenReader(false)}>
          <div
            className="nx-reader"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="nx-reader-head">
              <strong>{reader.title || "Lector"}</strong>
              <div className="nx-head-actions">
                <button onClick={handleTogglePlayPause} title="Reproducir/Pausa">
                  {ttsState.status === "playing" ? "⏸" : "🔊"}
                </button>
                <button onClick={handleRestart} title="Reiniciar lectura">
                  ⟲
                </button>
                {reader.url && isHttp(reader.url) && (
                  <a href={reader.url} target="_blank" rel="noreferrer">
                    Fuente
                  </a>
                )}
                <button onClick={() => setOpenReader(false)} title="Cerrar">✕</button>
              </div>
            </div>
            <div
              className="nx-reader-body"
              dangerouslySetInnerHTML={{
                __html: reader.html || "<p>Cargando…</p>",
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        :root{ --nx-dvh:100vh; }
        @supports(height:100dvh){ :root{ --nx-dvh:100dvh; } }

        .nx-fab{
          position:fixed; right:18px; bottom:18px; z-index:70;
          background:#b30000; color:#fff; border:none; border-radius:999px;
          padding:10px 14px; font-weight:700; box-shadow:0 8px 20px rgba(0,0,0,.25);
        }
        .nx-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.45);
          backdrop-filter:blur(2px); display:flex; justify-content:flex-end; z-index:60;
        }
        .nx-panel{
          height:calc(var(--nx-dvh) - 8vh); margin:4vh 16px; width:480px; max-width:92vw;
          background:#fff; border-radius:14px; display:flex; flex-direction:column; overflow:hidden;
        }
        .nx-panel-head{
          background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff;
          padding:12px 14px; display:flex; justify-content:space-between; align-items:center;
        }
        .nx-head-actions button.nx-ghost{
          background:transparent; color:#fff; border:none; padding:6px 8px; cursor:pointer;
        }

        .nx-list{ padding:10px; overflow:auto; -webkit-overflow-scrolling:touch; flex:1; }
        .nx-card{
          border:1px solid #eee; border-radius:10px; overflow:hidden; margin-bottom:10px; transition:.2s; background:#fff;
        }
        .nx-card:hover{ box-shadow:0 6px 14px rgba(0,0,0,.15); transform:translateY(-2px); }
        .nx-card img{ width:100%; aspect-ratio:16/9; object-fit:cover; background:#f5f5f5; }
        .nx-title{ padding:10px; font-size:16px; font-weight:700; color:#2b1a12; }
        .nx-desc{ padding:0 10px 10px; color:#5b463b; font-size:14px; }
        .nx-meta{ display:flex; justify-content:space-between; font-size:12px; color:#7a5a4a; padding:0 10px 10px; }
        .nx-info,.nx-error,.nx-done{ text-align:center; padding:10px; color:#5b463b; }
        .nx-error{ color:#a33; }
        .nx-more{text-align:center;padding:10px;}

        .nx-reader-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,.45);
          display:flex; justify-content:center; align-items:center; z-index:65;
        }
        .nx-reader{
          width:min(980px,96vw); max-height:calc(var(--nx-dvh) - 10vh);
          background:#fff; border-radius:12px; overflow:hidden; display:flex; flex-direction:column;
        }
        .nx-reader-head{
          background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff;
          padding:10px 14px; display:flex; justify-content:space-between; align-items:center;
        }
        .nx-reader-head a{ color:#fff; text-decoration:underline; margin:0 6px; }
        .nx-reader-body{
          padding:16px; overflow:auto; -webkit-overflow-scrolling:touch; flex:1; line-height:1.7; color:#2b1a12;
        }

        @media(max-width:680px){
          .nx-panel,.nx-reader{ width:100%; height:var(--nx-dvh); border-radius:0; margin:0; }
        }
      `}</style>
    </>
  );
}
