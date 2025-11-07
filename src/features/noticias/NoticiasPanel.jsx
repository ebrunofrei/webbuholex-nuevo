import React, { useCallback, useEffect, useRef, useState, startTransition } from "react";
import * as newsClient from "@/services/noticiasClientService.js";
import { getContenidoNoticia } from "@/services/noticiasContenido.js";
import { softFilter, dedupeByKey, keyOf as keyOfFromUtils } from "@/utils/noticiasFilter.js";

/* ================== Servicios ================== */
const getGeneralNews =
  newsClient.getGeneralNews || newsClient.getNoticiasRobust || newsClient.getNoticias || null;
const clearNoticiasCache = newsClient.clearNoticiasCache || (() => {});

/* ================== Utils ================== */
const keyOf = (n, i) =>
  keyOfFromUtils
    ? keyOfFromUtils(n, i)
    : (n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`);

/* ================== Cache (mem) ================== */
const NEWS_CACHE = { ts: 0, items: [], page: 1, hasMore: true };
const TTL_MS = 90_000;

/* ================== Componente ================== */
export default function NoticiasPanel() {
  /* Drawer */
  const [openPanel, setOpenPanel] = useState(false);

  /* Reader */
  const [openReader, setOpenReader] = useState(false);
  const [reader, setReader] = useState({ title: "", html: "", url: "", raw: null });

  /* Lista */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastErr, setLastErr] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /* Concurrencia */
  const abortRef = useRef(null);
  const reqSeqRef = useRef(0);
  const itemsRef = useRef([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  /* ============ Prefetch / Fetch ============ */
  const didPrefetchRef = useRef(false);

  const prefetch = useCallback(async () => {
    if (didPrefetchRef.current || !getGeneralNews) return;
    const fresh = Date.now() - NEWS_CACHE.ts < TTL_MS;
    if (fresh && NEWS_CACHE.items.length) { didPrefetchRef.current = true; return; }
    try { await coreFetch({ mode: "reset", prefetchOnly: true }); } catch {}
  }, []);

  const withTimeout = (p, ms, note = "timeout") =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(note)), ms))]);

  const coreFetch = useCallback(async ({ mode = "reset", prefetchOnly = false } = {}) => {
    if (!getGeneralNews) return;
    const now = Date.now();
    const cacheFresh = now - NEWS_CACHE.ts < TTL_MS;

    if (mode === "reset") {
      if (cacheFresh && NEWS_CACHE.items.length && !prefetchOnly) {
        startTransition(() => {
          setItems(NEWS_CACHE.items); setPage(NEWS_CACHE.page);
          setHasMore(NEWS_CACHE.hasMore); setLastErr(""); setLoading(false);
        });
        return;
      }
      abortRef.current?.abort?.();
      abortRef.current = new AbortController();
      reqSeqRef.current += 1;
      if (!prefetchOnly) { setLoading(true); setLastErr(""); }
      clearNoticiasCache?.();
    } else {
      if (!abortRef.current) abortRef.current = new AbortController();
      setLoadingMore(true);
    }

    const controller = abortRef.current;
    const mySeq = reqSeqRef.current;
    const nextPage = mode === "reset" ? 1 : (NEWS_CACHE.page || 1) + 1;
    const base = { page: nextPage, limit: 25, lang: "es", signal: controller.signal };

    // Race rápido entre 2d y feed
    const t2d = withTimeout(getGeneralNews({ ...base, sinceDays: 2 }), 8500, "t2d");
    const tf  = withTimeout(getGeneralNews({ ...base }), 8500, "tfeed");
    let winnerItems = [];

    try {
      const res = await Promise.any([t2d, tf]);
      winnerItems = Array.isArray(res?.items) ? res.items : [];

      // Merge en background del perdedor
      const loserP = res === await t2d ? tf : t2d;
      loserP.then((lr) => {
        const larr = Array.isArray(lr?.items) ? lr.items : [];
        if (larr?.length) mergeLoser(larr);
      }).catch(() => {});
    } catch {
      try {
        const r7 = await withTimeout(getGeneralNews({ ...base, sinceDays: 7 }), 8500, "t7d");
        winnerItems = Array.isArray(r7?.items) ? r7.items : [];
      } catch (err) {
        if (!prefetchOnly) setLastErr(prev => prev || err?.message || String(err));
      }
    }
    if (controller.signal.aborted || mySeq !== reqSeqRef.current) return;

    const acc = new Map((mode === "reset" ? [] : (NEWS_CACHE.items || [])).map((it, i) => [keyOf(it, i), it]));
    winnerItems?.forEach((it, i) => { const k = keyOf(it, i); if (!acc.has(k)) acc.set(k, it); });

    const deduped = dedupeByKey(Array.from(acc.values()), keyOf);
    const filtered = softFilter(deduped, "actualidad");
    const show = mode === "reset" ? filtered.slice(0, 18) : filtered;

    NEWS_CACHE.ts = now;
    NEWS_CACHE.items = filtered;
    NEWS_CACHE.page = nextPage;
    NEWS_CACHE.hasMore = !!winnerItems?.length;

    if (prefetchOnly) return;

    startTransition(() => {
      setItems(show); setPage(nextPage); setHasMore(!!winnerItems?.length);
      if (mode === "reset") setLoading(false); else setLoadingMore(false);
    });

    function mergeLoser(extra) {
      if (!extra?.length) return;
      const acc2 = new Map(NEWS_CACHE.items.map((it, i) => [keyOf(it, i), it]));
      extra.forEach((it, i) => { const k = keyOf(it, i); if (!acc2.has(k)) acc2.set(k, it); });
      const filtered2 = softFilter(dedupeByKey(Array.from(acc2.values()), keyOf), "actualidad");
      NEWS_CACHE.items = filtered2;
      startTransition(() => {
        setItems(prev => (filtered2.length <= prev.length + 2 ? prev : filtered2));
      });
    }
  }, []);

  const fetchNoticias = useCallback(async (mode = "reset") => {
    try { await coreFetch({ mode }); }
    catch (e) { setLastErr(prev => prev || e?.message || String(e)); setLoading(false); setLoadingMore(false); }
  }, [coreFetch]);

  useEffect(() => { if (openPanel) fetchNoticias("reset"); }, [openPanel, fetchNoticias]);

  /* ============ Reader ============ */
  const readerViewportRef = useRef(null);

  const openReaderFor = async (n) => {
    try {
      setOpenPanel(false);
      setReader({ title: n.titulo || n.title || "", html: "<p>Cargando…</p>", url: n.enlace || n.url || n.link, raw: n });
      setOpenReader(true);
      const url = n.enlace || n.url || n.link;
      if (!url) { setReader(r=>({ ...r, html:"<p>No hay enlace disponible.</p>" })); return; }
      const { contenido, html } = await getContenidoNoticia({ url, full:true });
      setReader(r=>({ ...r, html: contenido || html || "<p>Sin contenido.</p>" }));
      setTimeout(() => { readerViewportRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, 0);
    } catch {
      setReader(r=>({ ...r, html:`<p style="color:#a33">No se pudo cargar el contenido.</p>` }));
    }
  };

  /* ================== Render ================== */
  return (
    <>
      {/* FAB */}
      <button
        className="nx-fab"
        title="Noticias"
        aria-label="Abrir noticias"
        onClick={() => setOpenPanel(true)}
        onMouseEnter={prefetch}
        onFocus={prefetch}
      >
        <span className="nx-fab-sound" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 10v4a1 1 0 001 1h2l3 3V6l-3 3H4a1 1 0 00-1 1zm13.54-6.46l-1.41 1.41A7 7 0 0118 12a7 7 0 01-2.87 5.75l1.41 1.41A9 9 0 0020 12a9 9 0 00-3.46-7.46zM14.1 7.1l-1.41 1.41A3 3 0 0113 12c0 .88-.36 1.68-.94 2.26l1.41 1.41A5 5 0 0015 12a5 5 0 00-.9-2.9z"/>
          </svg>
        </span>
        <span className="nx-fab-label">Noticias</span>
      </button>

      {/* Drawer */}
      {openPanel && (
        <div className="nx-overlay">
          <div className="nx-backdrop" onClick={() => setOpenPanel(false)} />
          <aside className="nx-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="nx-panel-head">
              <h3>NOTICIAS DE ACTUALIDAD</h3>
              <button className="nx-ghost" title="Cerrar" onClick={() => setOpenPanel(false)} aria-label="Cerrar">✕</button>
            </div>

            <div className="nx-list">
              {loading && (
                <div className="nx-skeleton-list">
                  {Array.from({ length: 4 }).map((_, i) => <div key={i} className="nx-skeleton-card" />)}
                </div>
              )}
              {!loading && lastErr && <div className="nx-info" style={{ color: "#a33" }}>{lastErr}</div>}
              {!loading && !lastErr && items.length === 0 && <div className="nx-info">Sin resultados.</div>}

              {!loading && items.map((n, i) => {
                const id = keyOf(n, i);
                const img = n.imagen || n.image || n.urlToImage || n.preview_image || n.sourceImage || "";
                const title = n.titulo || n.title || n.headline || "(Sin título)";
                const desc = n.resumen || n.description || n.abstract || n.snippet || "";
                const src  = n.fuente || n.source?.name || n.source || "";
                const d = n.fecha ? new Date(n.fecha) : (n.publishedAt ? new Date(n.publishedAt) : null);

                return (
                  <article
                    key={id}
                    className="nx-card nx-card-vert nx-clickable"
                    onClick={() => openReaderFor(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e)=>{ if(e.key==='Enter') openReaderFor(n); }}
                    title="Abrir lector"
                  >
                    {img ? <img src={img} alt="" loading="lazy" /> : null}
                    <h3 className="nx-title">{title}</h3>
                    {desc && <p className="nx-desc">{desc}</p>}
                    <div className="nx-meta">
                      <span>{src}</span>
                      <span>{d ? d.toLocaleDateString("es-PE") : ""}</span>
                    </div>
                  </article>
                );
              })}

              {!loading && items.length > 0 && hasMore && (
                <div className="nx-more">
                  <button className="nx-more-btn" onClick={() => fetchNoticias("more")} disabled={loadingMore}>
                    {loadingMore ? "Cargando…" : "Cargar más"}
                  </button>
                </div>
              )}
            </div>

            <div className="nx-panel-foot">
              <span>¿Buscas noticias jurídicas por especialidad?</span>
              <a href="/oficinaVirtual/noticias">Visita nuestra Oficina Virtual</a>
            </div>
          </aside>
        </div>
      )}

      {/* Reader (solo Ver fuente y Cerrar) */}
      {openReader && (
        <div className="nx-overlay">
          <div className="nx-backdrop" onClick={() => setOpenReader(false)} />
          <section
            className="nx-reader"
            role="dialog"
            aria-modal="true"
            aria-label="Lector de noticia"
            onClick={(e)=>e.stopPropagation()}
          >
            <header className="nx-reader-head">
              <strong className="nx-reader-title">{reader.title || "Lector"}</strong>
              <div className="nx-actions" role="toolbar">
                {reader.url && (
                  <a
                    className="nx-ghost"
                    href={reader.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver fuente"
                  >
                    Ver fuente
                  </a>
                )}
                <button
                  className="nx-ghost"
                  onClick={() => setOpenReader(false)}
                  aria-label="Cerrar"
                  title="Cerrar"
                >✕</button>
              </div>
            </header>

            <div className="nx-reader-viewport" ref={readerViewportRef}>
              <article className="nx-article" dangerouslySetInnerHTML={{ __html: reader.html || "<p>Cargando…</p>" }} />
            </div>
          </section>
        </div>
      )}

      <style>{`
        /* FAB */
        .nx-fab{ position:fixed; right:18px; bottom:18px; z-index:70; background:#b30000; color:#fff; border:none; border-radius:999px; display:flex; align-items:center; gap:10px; padding:10px 14px; box-shadow:0 8px 20px rgba(0,0,0,.22); }
        .nx-fab:focus{ outline:2px solid #fff; outline-offset:2px; }
        .nx-fab-sound{ display:inline-flex; animation:nx-ping 1.8s infinite; }
        @keyframes nx-ping{ 0%{opacity:.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} 100%{opacity:.8;transform:scale(1)} }
        .nx-fab-label{ font-weight:700; }

        /* Overlay dividido */
        .nx-overlay{ position:fixed; inset:0; z-index:60; pointer-events:none; }
        .nx-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(2px); pointer-events:auto; }

        /* Drawer */
        .nx-panel{ position:relative; margin:4vh 16px 4vh auto; height:92vh; width:480px; max-width:92vw; background:#fff; border-radius:14px; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,.24); overflow:hidden; pointer-events:auto; }
        .nx-panel-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff; }
        .nx-panel-head h3{ margin:0; font-weight:800; color:#fff; letter-spacing:.3px; }
        .nx-ghost{ background:transparent; border:1px solid rgba(255,255,255,.35); color:#fff; padding:4px 8px; border-radius:8px; cursor:pointer; }

        .nx-list{ padding:10px; overflow:auto; height:100%; }
        .nx-card{ border:1px solid #eee; border-radius:10px; overflow:hidden; background:#fff; transition:box-shadow .2s ease, transform .2s ease; }
        .nx-card:hover{ box-shadow:0 6px 18px rgba(0,0,0,.12); transform:translateY(-2px); }
        .nx-card-vert{ display:flex; flex-direction:column; }
        .nx-card-vert img{ width:100%; aspect-ratio:16/9; object-fit:cover; background:#fafafa; border-bottom:1px solid #eee; }
        .nx-title{ font-size:16px; line-height:1.35; padding:10px 12px; color:#2b1a12; }
        .nx-desc{ font-size:14px; color:#5b463b; padding:0 12px 10px; }
        .nx-meta{ display:flex; justify-content:space-between; gap:8px; padding:8px 12px 10px; font-size:12px; color:#7a5a4a; }

        .nx-more{ display:flex; justify-content:center; padding:12px; }
        .nx-more-btn{ padding:8px 14px; border-radius:10px; border:1px solid #a86b4f; background:#fff; color:#5a2e18; font-weight:600; cursor:pointer; }
        .nx-more-btn:disabled{ opacity:.6; cursor:not-allowed; }

        .nx-panel-foot{ display:flex; gap:8px; align-items:center; justify-content:center; padding:10px 12px; background:#f7f2ef; border-top:1px solid #eadfd9; font-size:13px; }
        .nx-panel-foot a{ color:#8b4a2f; font-weight:700; text-decoration:underline; }

        /* Reader */
        .nx-reader{
          isolation:isolate;
          position:relative;
          z-index:1000;
          width:min(980px,96vw); max-height:88vh;
          background:#fff; border-radius:16px;
          display:flex; flex-direction:column; overflow:hidden;
          box-shadow:0 24px 60px rgba(0,0,0,.35); margin:6vh auto;
          pointer-events:auto;
        }
        .nx-reader-head{
          position:sticky; top:0; z-index:1002; pointer-events:auto;
          padding:12px 14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff;
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .nx-reader-title{ font-weight:800; color:#fff; margin-right:auto; }
        .nx-actions{ display:flex; gap:6px; align-items:center; }
        .nx-reader-viewport{ position:relative; z-index:1; flex:1 1 auto; overflow:auto; background:#faf9f8; padding:22px; pointer-events:auto; }
        .nx-article{
          background:#fff; border-radius:12px; padding:28px 30px; box-shadow:0 10px 26px rgba(0,0,0,.12);
          color:#2b1a12; line-height:1.75; font-size:18px;
        }
        .nx-article img{ max-width:100%; height:auto; border-radius:8px; }
        .nx-article p{ margin:0 0 14px; }
        .nx-article h1,.nx-article h2,.nx-article h3{ margin:16px 0 8px; line-height:1.35; }

        /* Neutraliza z-index/position agresivos del HTML remoto */
        .nx-article, .nx-article *{ position:relative !important; z-index:0 !important; }
        .nx-article *[style*="position:fixed"], .nx-article *[style*="position: sticky"]{ position:relative !important; }

        @media (max-width:680px){
          .nx-panel{ width:100%; max-width:100%; margin:0; border-radius:0; height:100vh; }
          .nx-panel-head{ border-radius:0; }
          .nx-reader{ width:100%; height:100vh; max-height:100vh; border-radius:0; margin:0; }
          .nx-reader-viewport{ padding:14px; }
          .nx-article{ padding:18px 16px; font-size:17px; }
        }
      `}</style>
    </>
  );
}
