// ============================================================
// 🦉 BúhoLex | Noticias Botón Flotante (UI/UX PRO)
// - Chips que SÍ filtran (incluye "actualidad")
// - 1 sola columna vertical, cards clicables → abren lector
// - TTS SOLO en el lector (toggle parlante en el header del lector)
// - FAB megáfono rojo animado (CTA) / header marrón + texto blanco
// - Sin autoplay; silencio al cerrar lector/panel
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import "@/styles/noticias.css";

// ---------- Chips (usa CHIP_MAP si existe; fallback si no) ----------
let CHIP_MAP = {};
try {
  CHIP_MAP = (await import("@/constants/noticiasGeneralChips")).CHIP_MAP || {};
} catch {}

const FALLBACK_CHIPS = {
  actualidad: { q: "actualidad OR última hora", providers: [] },
  politica:   { q: "política OR gobierno OR congreso", providers: [] },
  economia:   { q: "economía OR inflación OR dólar OR empleo", providers: [] },
  corrupción: { q: "corrupción OR soborno OR lavado de activos", providers: [] },
  ciencia:    { q: "ciencia OR salud OR investigación", providers: [] },
  tecnología: { q: "tecnología OR IA OR ciberseguridad", providers: [] },
  sociedad:   { q: "sociedad OR educación OR cultura", providers: [] },
};

const CHIP_SOURCE = Object.keys(CHIP_MAP).length ? CHIP_MAP : FALLBACK_CHIPS;
const CHIPS = Object.entries(CHIP_SOURCE).map(([key, conf]) => ({
  key,
  label: (conf?.label || key).toString(),
  conf: { q: conf?.q || "", providers: conf?.providers || [] },
}));

// ---------- Servicios ----------
import {
  getNoticiasRobust,
  getNewsLive,
  clearNoticiasCache,
} from "@/services/noticiasClientService.js";
import { getContenidoNoticia } from "@/services/noticiasContenido.js";

// ---------- Helpers ----------
const keyOf = (n, i) =>
  n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`;

const sanitizeForTTS = (htmlOrText = "") =>
  String(htmlOrText)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, " ")
    .replace(/(👍|👎|⭐️|➡️|⬆️|⬇️|🔊|🔇|📰|🔔|💬|🎤|⏸️|▶️|❌|✔️|✕|↻)/g, " ")
    // quita números sueltos cortos (evita leer "12" "24" de UI), deja años
    .replace(/\b(?!(?:19|20)\d{2}\b)\d{1,3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const chunkText = (text, size = 1700) => {
  const out = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const dot = text.lastIndexOf(".", end);
    if (dot > i + 200) end = dot + 1;
    out.push(text.slice(i, end).trim());
    i = end;
  }
  return out.filter(Boolean);
};

// ============================================================

export default function NoticiasBotonFlotante() {
  // Panel y lector
  const [openPanel, setOpenPanel] = useState(false);
  const [openReader, setOpenReader] = useState(false);

  // Filtro
  const [tema, setTema] = useState(CHIPS[0]?.key || "politica");

  // Datos
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastErr, setLastErr] = useState("");
  const [urlEfectiva, setUrlEfectiva] = useState("");

  // Lector
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const speakingRef = useRef(false);         // estado interno del TTS
  const [readingOn, setReadingOn] = useState(false); // para UI del botón del lector
  const [reader, setReader] = useState({ title: "", html: "", url: "", raw: null });
  const readerShellRef = useRef(null);

  // Config del chip activo
  const activeConf = useMemo(() => {
    const found = CHIPS.find((c) => c.key === tema);
    if (found) return found.conf;
    return { q: "", providers: [] };
  }, [tema]);

  // Cargar noticias
  const fetchNoticias = async () => {
    if (!openPanel) return;
    setLoading(true);
    setLastErr("");
    try {
      const req = { page: 1, limit: 25, q: activeConf.q || undefined, providers: activeConf.providers || [] };
      const { items: its, url } = await getNewsLive(req).catch(async () => await getNoticiasRobust(req));
      setItems(Array.isArray(its) ? its : []);
      setUrlEfectiva(url || "");
    } catch (e) {
      setItems([]);
      setLastErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // Recarga al cambiar chip
  useEffect(() => {
    if (!openPanel) return;
    setItems([]);
    clearNoticiasCache?.();
    fetchNoticias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPanel, tema]);

  // -------- TTS (solo lector) --------
  const stopTTS = () => {
    try { synthRef.current?.cancel?.(); } catch {}
    speakingRef.current = false;
    setReadingOn(false);
  };

  // Silencia al cerrar panel o lector
  useEffect(() => { if (!openPanel && speakingRef.current) stopTTS(); }, [openPanel]);
  useEffect(() => { if (!openReader && speakingRef.current) stopTTS(); }, [openReader]);

  const toggleReaderTTS = () => {
    if (!synthRef.current) return;
    if (speakingRef.current) { stopTTS(); return; }

    const plain =
      sanitizeForTTS(`${reader.title || ""}. ${reader.html || ""}`) ||
      sanitizeForTTS(reader.raw?.resumen || reader.raw?.description || "");

    if (!plain) return;

    const chunks = chunkText(plain);
    let idx = 0;

    const speakNext = () => {
      if (!speakingRef.current) return;
      if (idx >= chunks.length) { stopTTS(); return; }
      const utt = new SpeechSynthesisUtterance(chunks[idx]);
      utt.lang = "es-PE";
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.onend = () => { idx += 1; speakNext(); };
      utt.onerror = () => { idx += 1; speakNext(); };
      synthRef.current.speak(utt);
    };

    speakingRef.current = true;
    setReadingOn(true);
    speakNext();
  };

  // Abrir lector (card click)
  const openReaderFor = async (n) => {
    try {
      setReader({ title: n.titulo || n.title || "", html: "<p>Cargando…</p>", url: "", raw: n });
      setOpenReader(true);
      const url = n.enlace || n.url || n.link;
      if (!url) { setReader((r) => ({ ...r, html: "<p>No hay enlace disponible.</p>" })); return; }
      const { contenido, html } = await getContenidoNoticia({ url, full: true });
      setReader({ title: n.titulo || n.title || "", html: contenido || html || "<p>Sin contenido.</p>", url, raw: n });
    } catch {
      setReader((r) => ({ ...r, html: `<p style="color:#a33">No se pudo cargar el contenido.</p>` }));
    }
  };

  // ---------- Render ----------
  return (
    <>
      {/* FAB megáfono */}
      <button className="nx-fab" title="Noticias" onClick={() => setOpenPanel(true)} aria-label="Abrir noticias">
        <span className="nx-fab-sound" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 10v4a1 1 0 001 1h2l3 3V6l-3 3H4a1 1 0 00-1 1zm13.54-6.46l-1.41 1.41A7 7 0 0118 12a7 7 0 01-2.87 5.75l1.41 1.41A9 9 0 0020 12a9 9 0 00-3.46-7.46zM14.1 7.1l-1.41 1.41A3 3 0 0113 12c0 .88-.36 1.68-.94 2.26l1.41 1.41A5 5 0 0015 12a5 5 0 00-.9-2.9z"/>
          </svg>
        </span>
        <span className="nx-fab-label">Noticias</span>
      </button>

      {/* Overlay + Panel lateral */}
      {openPanel && (
        <div className="nx-overlay" onClick={() => setOpenPanel(false)}>
          <aside className="nx-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="nx-panel-head">
              <h3>Noticias</h3>
              <div className="nx-head-actions">
                <button className="nx-ghost" title="Recargar" onClick={fetchNoticias}>↻</button>
                <button className="nx-ghost" title="Cerrar" onClick={() => setOpenPanel(false)} aria-label="Cerrar">✕</button>
              </div>
            </div>

            {/* Chips */}
            <div className="nx-chips">
              {CHIPS.map((c) => (
                <button
                  key={c.key}
                  className={`nx-chip ${tema === c.key ? "is-active" : ""}`}
                  onClick={() => setTema(c.key)}
                  title={c.label}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Lista 1 columna (cards clicables) */}
            <div className="nx-list">
              {loading && (
                <div className="nx-skeleton-list">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="nx-skeleton-card" />)}
                </div>
              )}
              {!loading && lastErr && <div className="nx-info" style={{ color: "#a33" }}>{lastErr}</div>}
              {!loading && !lastErr && items.length === 0 && <div className="nx-info">Sin resultados.</div>}

              {!loading && items.map((n, i) => {
                const id = keyOf(n, i);
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
                    {(n.imagen || n.image || n.urlToImage) && (
                      <img src={n.imagen || n.image || n.urlToImage} alt="" loading="lazy" />
                    )}
                    <h3 className="nx-title">{n.titulo || n.title || n.headline || "(Sin título)"}</h3>
                    {(n.resumen || n.description || n.abstract || n.snippet) && (
                      <p className="nx-desc">{n.resumen || n.description || n.abstract || n.snippet}</p>
                    )}
                    <div className="nx-meta">
                      <span>{n.fuente || n.source || ""}</span>
                      <span>
                        {n.fecha
                          ? new Date(n.fecha).toLocaleDateString("es-PE")
                          : n.publishedAt
                          ? new Date(n.publishedAt).toLocaleDateString("es-PE")
                          : ""}
                      </span>
                    </div>
                    {/* Nota: SIN botones de 'Leer' ni 'Abrir' aquí */}
                  </article>
                );
              })}
            </div>
            {/* <div className="nx-foot-debug">URL efectiva: {urlEfectiva}</div> */}
          </aside>
        </div>
      )}

      {/* Lector (con parlante/toggle en header) */}
      {openReader && (
        <div className="nx-reader-overlay" onClick={() => setOpenReader(false)}>
          <div
            className="nx-reader"
            ref={readerShellRef}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Lector de noticia"
          >
            <div className="nx-reader-head">
              <strong className="nx-reader-title">{reader.title || "Lector"}</strong>
              <div className="nx-head-actions">
                {/* Parlante en el LECTOR */}
                <button
                  className={`nx-ghost nx-voice ${readingOn ? "is-on" : ""}`}
                  onClick={toggleReaderTTS}
                  title={readingOn ? "Silenciar" : "Leer en voz alta"}
                  aria-label={readingOn ? "Silenciar" : "Leer en voz alta"}
                >
                  {readingOn ? (
                    // Icono silenciar
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12a4.5 4.5 0 01-1.32 3.18l1.41 1.41A6.5 6.5 0 0018.5 12a6.5 6.5 0 00-1.91-4.59l-1.41 1.41A4.5 4.5 0 0116.5 12zM3 10v4a1 1 0 001 1h2l3 3V6l-3 3H4a1 1 0 00-1 1zm13.54-6.46l-1.41 1.41 1.41 1.41 1.41-1.41-1.41-1.41z"/></svg>
                  ) : (
                    // Icono parlante animado
                    <svg className="nx-voice-anim" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10v4a1 1 0 001 1h2l3 3V6l-3 3H4a1 1 0 00-1 1zm13.54-6.46l-1.41 1.41A7 7 0 0118 12a7 7 0 01-2.87 5.75l1.41 1.41A9 9 0 0020 12a9 9 0 00-3.46-7.46zM14.1 7.1l-1.41 1.41A3 3 0 0113 12c0 .88-.36 1.68-.94 2.26l1.41 1.41A5 5 0 0015 12a5 5 0 00-.9-2.9z"/></svg>
                  )}
                </button>

                {reader.url && (
                  <a className="nx-ghost" href={reader.url} target="_blank" rel="noopener noreferrer" title="Ver fuente">
                    Ver fuente
                  </a>
                )}
                <button className="nx-ghost" onClick={() => setOpenReader(false)} aria-label="Cerrar">✕</button>
              </div>
            </div>

            <div className="nx-reader-body" dangerouslySetInnerHTML={{ __html: reader.html || "<p>Cargando…</p>" }} />
          </div>
        </div>
      )}

      {/* Estilos del panel / lector / FAB */}
      <style>{`
        .nx-fab{
          position:fixed; right:18px; bottom:18px; z-index:70;
          background:#b30000; color:#fff; border:none; border-radius:999px;
          display:flex; align-items:center; gap:10px; padding:10px 14px;
          box-shadow:0 8px 20px rgba(0,0,0,.22);
        }
        .nx-fab:focus{ outline:2px solid #fff; outline-offset:2px; }
        .nx-fab-sound{ display:inline-flex; animation:nx-ping 1.8s infinite; }
        @keyframes nx-ping{ 0%{opacity:.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} 100%{opacity:.8;transform:scale(1)} }
        .nx-fab-label{ font-weight:700; }

        .nx-overlay{ position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.45); backdrop-filter:blur(2px);
          display:flex; justify-content:flex-end; align-items:stretch; }
        .nx-panel{ height:92vh; margin:4vh 16px 4vh 0; width:460px; max-width:92vw; background:#fff; border-radius:14px; display:flex; flex-direction:column;
          box-shadow:0 10px 30px rgba(0,0,0,.24); }
        .nx-panel-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px;
          border-top-left-radius:14px; border-top-right-radius:14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff; }
        .nx-panel-head h3{ margin:0; font-weight:800; color:#fff; }
        .nx-head-actions{ display:flex; gap:6px; }
        .nx-ghost{ background:transparent; border:1px solid rgba(255,255,255,.35); color:#fff; padding:4px 8px; border-radius:8px; }
        .nx-voice.is-on{ background:#b30000; border-color:#b30000; }
        .nx-voice-anim{ animation:nx-pulse .9s infinite ease-in-out; }
        @keyframes nx-pulse{ 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }

        .nx-chips{ position:sticky; top:0; z-index:1; display:flex; gap:8px; overflow-x:auto; padding:10px; background:#fff; border-bottom:1px solid #eee; }
        .nx-chip{ flex:0 0 auto; padding:8px 12px; border-radius:999px; border:1px solid #a0522d; background:#fff; color:#5a2e18; font-size:14px; cursor:pointer; white-space:nowrap; transition:.15s ease; }
        .nx-chip:hover{ transform:translateY(-1px); box-shadow:0 2px 8px rgba(0,0,0,.06); }
        .nx-chip.is-active{ background:#b30000; border-color:#b30000; color:#fff; }

        .nx-list{ padding:10px; overflow:auto; height:100%; }
        .nx-card{ border:1px solid #eee; border-radius:10px; overflow:hidden; background:#fff; transition:box-shadow .2s ease, transform .2s ease; }
        .nx-card:hover{ box-shadow:0 6px 18px rgba(0,0,0,.12); transform:translateY(-2px); }
        .nx-card-vert{ display:flex; flex-direction:column; }
        .nx-card-vert img{ width:100%; aspect-ratio:16/9; object-fit:cover; background:#fafafa; border-bottom:1px solid #eee; }
        .nx-title{ font-size:16px; line-height:1.25; padding:10px 12px; color:#2b1a12; }
        .nx-desc{ font-size:14px; color:#5b463b; padding:0 12px 10px; }
        .nx-meta{ display:flex; justify-content:space-between; gap:8px; padding:8px 12px 10px; font-size:12px; color:#7a5a4a; }
        .nx-clickable{ cursor:pointer; }

        .nx-info{ padding:20px; text-align:center; color:#7a5a4a; }
        .nx-skeleton-list{ display:grid; gap:12px; }
        .nx-skeleton-card{ height:140px; border-radius:10px; background:linear-gradient(90deg,#f3f3f3,#ececec,#f3f3f3);
          background-size:200% 100%; animation:nx-shimmer 1.2s infinite linear; }
        @keyframes nx-shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .nx-reader-overlay{ position:fixed; inset:0; z-index:65; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; }
        .nx-reader{ width:min(980px,96vw); max-height:88vh; background:#fff; border-radius:14px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,.28); }
        .nx-reader-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff; }
        .nx-reader-title{ font-weight:800; color:#fff; }
        .nx-reader-body{ padding:16px; overflow:auto; }

        @media (max-width:680px){
          .nx-panel{ width:100%; max-width:100%; margin:0; border-radius:0; height:100vh; }
          .nx-panel-head{ border-radius:0; }
        }
      `}</style>
    </>
  );
}
