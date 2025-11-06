// src/features/noticias/NoticiasPanel.jsx
// ============================================================
// 🦉 BúhoLex | Noticias (Panel unificado + FAB + Lector con TTS)
// - Chips confiables (CHIP_MAP) + estrategia por intentos:
//   1) providers + tema + sinceDays=2
//   2) providers + tema + sinceDays=7
//   3) solo tema
//   4) tema + q (si el chip define query)
//   5) category (si aplica)
//   6) solo providers
//   7) feed amplio
// - Cache-busting por chip, secuenciación y dedupe
// - Filtro cliente “suave” (si deja <3, se relaja)
// - TTS SOLO dentro del lector
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------- Chips (externo + fallback) ----------
import { CHIP_MAP as CHIP_MAP_CONST } from "@/constants/noticiasGeneralChips";
const CHIP_MAP_SAFE = CHIP_MAP_CONST && Object.keys(CHIP_MAP_CONST).length ? CHIP_MAP_CONST : {};

const FALLBACK_CHIPS = {
  actualidad: { label: "actualidad", q: 'actualidad OR "última hora" OR breaking', providers: [] },
  politica:   { label: "política",   q: "politica OR gobierno OR congreso OR parlamento OR elecciones", providers: ["elpais","elcomercio","rpp"] },
  economia:   { label: "economía",   q: "economia OR dolar OR inflación OR empleo OR inversion", providers: ["elpais","rpp"] },
  corrupcion: { label: "corrupción", q: "corrupcion OR soborno OR lavado de activos OR cohecho", providers: ["elpais","rpp"] },
  ciencia:    { label: "ciencia",    q: "ciencia OR salud OR investigacion OR medicina", providers: ["bbc","dw","ap","reuters"] },
  tecnologia: { label: "tecnología", q: "tecnologia OR IA OR ciberseguridad OR software", providers: ["bbc","dw","ap","reuters"] },
  sociedad:   { label: "sociedad",   q: "sociedad OR educacion OR cultura OR transporte", providers: ["elpais","rpp"] },
  internacional: { label: "internacional", q: "internacional OR mundo OR geopolitica", providers: ["reuters","ap","bbc","dw","euronews"] },
};

const CHIP_SOURCE = Object.keys(CHIP_MAP_SAFE).length ? CHIP_MAP_SAFE : FALLBACK_CHIPS;
const CHIPS = Object.entries(CHIP_SOURCE).map(([key, conf]) => ({
  key,
  label: (conf?.label || key).toString(),
  conf: { q: conf?.q || "", providers: conf?.providers || [] },
}));

// ---------- Category (para fuentes que la soportan) ----------
const CATEGORY_BY_CHIP = {
  actualidad: undefined,
  politica:   "politics",
  economia:   "business",
  corrupcion: undefined,
  ciencia:    "science",
  tecnologia: "technology",
  sociedad:   "world",
};

// ---------- Q robusto multilíngüe base ----------
const Q_BY_CHIP = {
  actualidad: 'actualidad OR "última hora" OR breaking',
  politica:   '(política OR gobierno OR congreso OR decreto OR ley OR presidente) OR (politics OR government OR parliament OR president)',
  economia:   '(economía OR inflacion OR inflación OR dólar OR empleo OR mercado OR finanzas OR SUNAT OR PBI) OR (economy OR inflation OR dollar OR employment OR market OR finance OR GDP)',
  corrupcion: '(corrupción OR soborno OR coima OR "lavado de activos" OR colusión OR peculado) OR (corruption OR bribery OR money laundering OR embezzlement)',
  ciencia:    '(ciencia OR investigación OR salud OR estudio OR descubrimiento OR universidad OR hospital) OR (science OR research OR study OR discovery OR health)',
  tecnologia: '(tecnología OR IA OR inteligencia artificial OR ciberseguridad OR software OR datos OR móvil OR robot OR chip) OR (technology OR AI OR cybersecurity OR software OR data OR mobile OR robotics OR chip)',
  sociedad:   '(sociedad OR educación OR cultura OR familia OR comunidad OR social) OR (society OR social OR community OR culture OR education)',
};

// ---------- Filtro cliente (suave) ----------
const SOFT_FILTER_RULES = {
  economia:   { must: ["econom","inflac","dolar","precio","mercad","finanz","banco","sunat","pbi"], stop: ["futbol","fútbol","deport","gol","liga"] },
  politica:   { must: ["gobiern","ministr","congres","president","elecc","decreto","ley","partid"], stop: [] },
  corrupcion: { must: ["corrup","soborn","coim","lavado","colusi","peculad","investig","fiscal"], stop: [] },
  ciencia:    { must: ["cienc","investig","salud","descubr","estudi","univers","hospital","medic"], stop: [] },
  tecnologia: { must: ["tecnolog","inteligen","ciber","softw","app","dato","movi","robot","chip","ia "], stop: [] },
  sociedad:   { must: ["socie","educa","cultur","famili","comun","psicol","social"], stop: [] },
  actualidad: { must: [], stop: [] },
};

const norm = (s="") => String(s).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const temaToSlug = (s="") => norm(s).trim();

const textOf = (n={}) =>
  norm(`${n.titulo||n.title||""} ${n.resumen||n.description||n.abstract||n.snippet||""}`);

function softFilter(items=[], temaSlug) {
  const rules = SOFT_FILTER_RULES[temaSlug] || SOFT_FILTER_RULES.actualidad;
  if (!rules || (!rules.must?.length && !rules.stop?.length)) return items;

  const filtered = items.filter((n) => {
    const t = textOf(n);
    if (rules.stop?.some((sw) => t.includes(sw))) return false;
    if (rules.must?.length) return rules.must.some((kw) => t.includes(kw));
    return true;
  });

  return filtered.length >= 3 ? filtered : items;
}

// ---------- Servicios ----------
import * as newsClient from "@/services/noticiasClientService.js";
const getGeneralNews =
  newsClient.getGeneralNews || newsClient.getNoticiasRobust || newsClient.getNoticias || null;
const clearNoticiasCache = newsClient.clearNoticiasCache || (() => {});
const API_BASE = newsClient.API_BASE || "/api";

import { getContenidoNoticia } from "@/services/noticiasContenido.js";

// ---------- Helpers UI/TTS ----------
const keyOf = (n, i) =>
  n.enlace || n.url || n.link || n.id || n._id || `${n.titulo || n.title || "item"}#${i}`;

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
  const out = []; let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const dot = text.lastIndexOf(".", end);
    if (dot > i + 200) end = dot + 1;
    out.push(text.slice(i, end).trim());
    i = end;
  }
  return out.filter(Boolean);
};

const MULTIMEDIA_PROVIDERS = [
  "reutersvideo","apvideo","euronews","cnn","bbc","dw",
  "ap","reuters","nytimes","guardian","elpais","elcomercio","rpp",
  "gnews","newsapi",
];
const normList = (arr=[]) =>
  Array.from(new Set(arr.map((p)=>String(p||"").trim().toLowerCase()).filter(Boolean)));
const allowOnlyMultimedia = (arr=[]) => arr.filter((p)=>MULTIMEDIA_PROVIDERS.includes(p));

// ============================================================

export default function NoticiasPanel() {
  // Visibilidad
  const [openPanel, setOpenPanel] = useState(false);
  const [openReader, setOpenReader] = useState(false);

  // Filtros
  const [tema, setTema] = useState(CHIPS[0]?.key || "actualidad");
  const [lang] = useState("es"); // si quieres, haz chips de idioma como en el modal
  const [providersSel, setProvidersSel] = useState([]);

  // Lista/estado
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastErr, setLastErr] = useState("");
  const [urlEfectiva, setUrlEfectiva] = useState("");
  const [profile, setProfile] = useState("");

  // Concurrencia
  const abortRef = useRef(null);
  const reqSeqRef = useRef(0);
  const temaRef = useRef(tema);

  // Lector + TTS
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const speakingRef = useRef(false);
  const [readingOn, setReadingOn] = useState(false);
  const [reader, setReader] = useState({ title: "", html: "", url: "", raw: null });

  // Config chip activa
  const activeConf = useMemo(() => {
    const found = CHIPS.find((c)=>c.key===tema);
    const mergedProviders = normList([...(found?.conf?.providers || []), ...(providersSel || [])]);
    return {
      q: (found?.conf?.q || "").trim(),
      providers: mergedProviders.length ? mergedProviders : allowOnlyMultimedia(MULTIMEDIA_PROVIDERS),
      label: found?.label || tema,
    };
  }, [tema, providersSel]);

  // -------- Carga determinista + fallback de ambos mundos --------
  const fetchNoticias = useCallback(async () => {
    if (!openPanel || !getGeneralNews) return;

    // cancelar secuencia anterior
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    const mySeq = ++reqSeqRef.current;
    const currentTema = tema; temaRef.current = tema;

    setLoading(true);
    setLastErr("");
    setProfile("");
    setItems([]);

    // limpiar cache para evitar cruces calientes
    clearNoticiasCache?.();

    const temaSlug = temaToSlug(currentTema);
    const category = CATEGORY_BY_CHIP[temaSlug];
    const qBuilt   = Q_BY_CHIP[temaSlug] || Q_BY_CHIP.actualidad;
    const qFinal   = activeConf.q ? `${activeConf.q} OR (${qBuilt})` : qBuilt;
    const providers = activeConf.providers;

    const base = { page:1, limit:25, lang, signal: controller.signal };

    // estrategia por intentos (fusionada)
    const attempts = [];
    if (providers.length) {
      attempts.push({ note:"providers+tema+sinceDays=2", params:{ ...base, providers, tema:temaSlug, sinceDays:2 }});
      attempts.push({ note:"providers+tema+sinceDays=7", params:{ ...base, providers, tema:temaSlug, sinceDays:7 }});
    }
    attempts.push({ note:"solo tema", params:{ ...base, tema:temaSlug }});
    if (activeConf.q) attempts.push({ note:"tema+q", params:{ ...base, tema:temaSlug, q:qFinal }});
    if (category) attempts.push({ note:`category=${category}`, params:{ ...base, category }});
    if (providers.length) attempts.push({ note:"solo providers", params:{ ...base, providers }});
    attempts.push({ note:"feed amplio", params:{ ...base }});

    const dedupe = new Map();
    let pickedNote = "";
    for (const a of attempts) {
      try {
        // URL efectiva (solo para diagnóstico)
        const qs = new URLSearchParams(
          Object.entries(a.params).reduce((acc,[k,v]) => { if(v!==undefined&&v!==null&&v!=="") acc[k]=String(v); return acc; }, {})
        ).toString();
        setUrlEfectiva(`${API_BASE}/news?${qs}`);

        const resp = await getGeneralNews(a.params);
        const arr = Array.isArray(resp?.items) ? resp.items : [];

        arr.forEach((it, i) => {
          const k = keyOf(it, i);
          if (!dedupe.has(k)) dedupe.set(k, it);
        });

        if (arr.length) { pickedNote = a.note; break; }
      } catch (e) {
        // sigue al siguiente intento
        setLastErr((prev)=> prev || e?.message || String(e));
      }
    }

    if (controller.signal.aborted || mySeq !== reqSeqRef.current || temaRef.current !== currentTema) return;

    const arr0 = Array.from(dedupe.values());
    const arr1 = softFilter(arr0, temaSlug);

    setProfile(pickedNote);
    setItems(arr1);
    setLoading(false);
  }, [openPanel, tema, activeConf.q, JSON.stringify(activeConf.providers), lang]);

  useEffect(() => { if (openPanel) fetchNoticias(); }, [openPanel, tema, fetchNoticias]);

  // -------- TTS sólo en lector --------
  const stopTTS = () => { try { synthRef.current?.cancel?.(); } catch {} speakingRef.current=false; setReadingOn(false); };
  useEffect(() => { if (!openPanel && speakingRef.current) stopTTS(); }, [openPanel]);
  useEffect(() => { if (!openReader && speakingRef.current) stopTTS(); }, [openReader]);

  const toggleReaderTTS = () => {
    if (!synthRef.current) return;
    if (speakingRef.current) { stopTTS(); return; }
    const plain = sanitizeForTTS(`${reader.title || ""}. ${reader.html || ""}`) ||
                  sanitizeForTTS(reader.raw?.resumen || reader.raw?.description || "");
    if (!plain) return;
    const chunks = chunkText(plain); let idx = 0;
    const speakNext = () => {
      if (!speakingRef.current) return;
      if (idx >= chunks.length) { stopTTS(); return; }
      const utt = new SpeechSynthesisUtterance(chunks[idx]);
      utt.lang = "es-PE"; utt.rate = 1.0; utt.pitch = 1.0;
      utt.onend = () => { idx += 1; speakNext(); };
      utt.onerror = () => { idx += 1; speakNext(); };
      synthRef.current.speak(utt);
    };
    speakingRef.current = true; setReadingOn(true); speakNext();
  };

  const openReaderFor = async (n) => {
    try {
      setReader({ title: n.titulo || n.title || "", html: "<p>Cargando…</p>", url: "", raw: n });
      setOpenReader(true);
      const url = n.enlace || n.url || n.link;
      if (!url) { setReader((r)=>({ ...r, html:"<p>No hay enlace disponible.</p>" })); return; }
      const { contenido, html } = await getContenidoNoticia({ url, full:true });
      setReader({ title: n.titulo || n.title || "", html: contenido || html || "<p>Sin contenido.</p>", url, raw:n });
    } catch {
      setReader((r)=>({ ...r, html:`<p style="color:#a33">No se pudo cargar el contenido.</p>` }));
    }
  };

  // -------- Render --------
  return (
    <>
      {/* FAB (trigger) */}
      <button className="nx-fab" title="Noticias" onClick={() => setOpenPanel(true)} aria-label="Abrir noticias">
        <span className="nx-fab-sound" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 10v4a1 1 0 001 1h2l3 3V6l-3 3H4a1 1 0 00-1 1zm13.54-6.46l-1.41 1.41A7 7 0 0118 12a7 7 0 01-2.87 5.75l1.41 1.41A9 9 0 0020 12a9 9 0 00-3.46-7.46zM14.1 7.1l-1.41 1.41A3 3 0 0113 12c0 .88-.36 1.68-.94 2.26l1.41 1.41A5 5 0 0015 12a5 5 0 00-.9-2.9z"/>
          </svg>
        </span>
        <span className="nx-fab-label">Noticias</span>
      </button>

      {/* Panel */}
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

            {/* Lista */}
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
                  </article>
                );
              })}
            </div>

            {/* Debug mínimo */}
            <div className="nx-foot-debug">URL: {urlEfectiva} | perfil: {profile}</div>
          </aside>
        </div>
      )}

      {/* Lector */}
      {openReader && (
        <div className="nx-reader-overlay" onClick={() => setOpenReader(false)}>
          <div className="nx-reader" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Lector de noticia">
            <div className="nx-reader-head">
              <strong className="nx-reader-title">{reader.title || "Lector"}</strong>
              <div className="nx-head-actions">
                <button
                  className={`nx-ghost nx-voice ${readingOn ? "is-on" : ""}`}
                  onClick={toggleReaderTTS}
                  title={readingOn ? "Silenciar" : "Leer en voz alta"}
                  aria-label={readingOn ? "Silenciar" : "Leer en voz alta"}
                >
                  {readingOn ? "🔇" : "🔊"}
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

      {/* estilos internos para no depender de otros archivos */}
      <style>{`
        .nx-fab{ position:fixed; right:18px; bottom:18px; z-index:70; background:#b30000; color:#fff; border:none; border-radius:999px; display:flex; align-items:center; gap:10px; padding:10px 14px; box-shadow:0 8px 20px rgba(0,0,0,.22); }
        .nx-fab:focus{ outline:2px solid #fff; outline-offset:2px; }
        .nx-fab-sound{ display:inline-flex; animation:nx-ping 1.8s infinite; }
        @keyframes nx-ping{ 0%{opacity:.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} 100%{opacity:.8;transform:scale(1)} }
        .nx-fab-label{ font-weight:700; }

        .nx-overlay{ position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.45); backdrop-filter:blur(2px); display:flex; justify-content:flex-end; align-items:stretch; }
        .nx-panel{ height:92vh; margin:4vh 16px 4vh 0; width:460px; max-width:92vw; background:#fff; border-radius:14px; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,.24); }
        .nx-panel-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-top-left-radius:14px; border-top-right-radius:14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff; }
        .nx-panel-head h3{ margin:0; font-weight:800; color:#fff; }
        .nx-head-actions{ display:flex; gap:6px; }
        .nx-ghost{ background:transparent; border:1px solid rgba(255,255,255,.35); color:#fff; padding:4px 8px; border-radius:8px; }

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

        .nx-info{ padding:20px; text-align:center; color:#7a5a4a; }
        .nx-skeleton-list{ display:grid; gap:12px; }
        .nx-skeleton-card{ height:140px; border-radius:10px; background:linear-gradient(90deg,#f3f3f3,#ececec,#f3f3f3); background-size:200% 100%; animation:nx-shimmer 1.2s infinite linear; }
        @keyframes nx-shimmer{ 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .nx-foot-debug{ padding:6px 10px; font-size:11px; color:#7a5a4a; border-top:1px solid #eee; }

        .nx-reader-overlay{ position:fixed; inset:0; z-index:65; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; }
        .nx-reader{ width:min(980px,96vw); max-height:88vh; background:#fff; border-radius:14px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,.28); }
        .nx-reader-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px; background:linear-gradient(90deg,#8b4a2f,#a86b4f); color:#fff; }
        .nx-reader-title{ font-weight:800; color:#fff; }
        .nx-reader-body{ padding:16px; overflow:auto; }
        .nx-voice.is-on{ background:#b30000; border-color:#b30000; }
        @media (max-width:680px){
          .nx-panel{ width:100%; max-width:100%; margin:0; border-radius:0; height:100vh; }
          .nx-panel-head{ border-radius:0; }
        }
      `}</style>
    </>
  );
}
