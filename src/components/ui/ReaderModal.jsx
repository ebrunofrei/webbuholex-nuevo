/* eslint-disable react/no-danger */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getContenidoNoticia as getContenidoNoticiaSvc } from "@services/noticiasContenido.js";
import { proxifyMedia as proxifyMediaSvc } from "@services/noticiasClientService.js";

// (opcional) fallback de TTS propio si no hay Web Speech
let reproducirVozVaronil = null;
try {
  reproducirVozVaronil = require("@/services/vozService.js")?.reproducirVozVaronil || null;
} catch {}

/* ---------- Constantes ---------- */
const FALLBACK_IMG = "/assets/default-news.jpg";
const hasWindow = typeof window !== "undefined";

const isHttp = (u) => /^https?:\/\//i.test(String(u || ""));
const isBadImg = (u = "") =>
  !u ||
  /bullet\.gif|placeholder|default|noimage|transparent|spacer/i.test(u) ||
  /^data:image\/gif/i.test(u);

const proxify = (u) =>
  isHttp(u)
    ? (proxifyMediaSvc ? proxifyMediaSvc(u) : `/api/media/proxy?url=${encodeURIComponent(u)}`)
    : u;

/* ---------- Helpers HTML ---------- */
function absolutize(u, base) {
  const raw = (u ?? "").toString().trim();
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  try {
    if (isHttp(raw)) return raw;
    if (base && /^https?:\/\//i.test(base)) return new URL(raw, base).href;
    return raw;
  } catch {
    return raw;
  }
}

async function getOgImage(url, { signal } = {}) {
  try {
    if (!isHttp(url)) return "";
    const r = await fetch(`/api/media/meta?url=${encodeURIComponent(url)}`, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!r.ok) return "";
    const j = await r.json().catch(() => ({}));
    return j?.ogImage || "";
  } catch {
    return "";
  }
}

/** Llama al servicio de extracción aceptando string u objeto */
async function getContenidoNoticia(urlOrItem, opts = {}) {
  try {
    if (typeof urlOrItem === "object") return await getContenidoNoticiaSvc({ ...(urlOrItem || {}), ...opts });
    if (typeof urlOrItem === "string") {
      try {
        return await getContenidoNoticiaSvc({ url: urlOrItem, ...opts });
      } catch {
        return await getContenidoNoticiaSvc(urlOrItem, opts);
      }
    }
  } catch {}
  return null;
}

function rewriteHtml(html = "", baseUrl = "") {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,noscript,style").forEach((n) => n.remove());

    doc.querySelectorAll("a[href]").forEach((a) => {
      const abs = absolutize(a.getAttribute("href"), baseUrl);
      a.setAttribute("href", abs);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });

    doc.querySelectorAll("img[src]").forEach((img) => {
      const abs = absolutize(img.getAttribute("src"), baseUrl);
      img.setAttribute("src", proxify(abs));
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
      img.removeAttribute("srcset");
    });

    doc.querySelectorAll("iframe[src]").forEach((f) => {
      const abs = absolutize(f.getAttribute("src"), baseUrl);
      f.setAttribute("src", abs);
      f.setAttribute("loading", "lazy");
      f.setAttribute("referrerpolicy", "no-referrer");
      f.setAttribute("allowfullscreen", "true");
      f.removeAttribute("width");
      f.removeAttribute("height");
      f.style.width = "100%";
      f.style.aspectRatio = "16/9";
      f.style.border = "0";
    });

    return doc.body.innerHTML || "";
  } catch {
    return html;
  }
}

function htmlToPlainText(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

/* ---------- Cache simple por URL ---------- */
const CONTENT_CACHE = new Map();

/* ============================================================
   COMPONENTE
   ============================================================ */
export default function ReaderModal({ open, item, onClose }) {
  const [cargando, setCargando] = useState(false);
  const [html, setHtml] = useState("");
  const [meta, setMeta] = useState({});
  const [fontScale, setFontScale] = useState(1.125); // ≈18px base

  const overlayRef = useRef(null);

  // ---- TTS control robusto ----
  // idle | playing | paused
  const [voiceState, setVoiceState] = useState("idle");
  const fullTextRef = useRef("");  // texto completo (título + contenido/summary)
  const charIndexRef = useRef(0);  // índice actual de lectura
  const utterRef = useRef(null);   // utterance activo

  const enlace = useMemo(() => item?.enlace || item?.url || item?.link || "", [item]);

  /* ---------- Carga de contenido ---------- */
  useEffect(() => {
    if (!open || !item) return;
    const abort = new AbortController();

    (async () => {
      setCargando(true);
      setHtml("");
      setMeta({});
      stopSpeech(); // por si estaba leyendo

      const baseMeta = {
        titulo: item.titulo || item.title || "",
        imagen: item.imagen || item.image || item.urlToImage || item.thumbnail || "",
        fuente: item.fuente || item.source?.name || item.source || "",
        fecha: item.fecha || item.publishedAt || item.pubDate || null,
      };

      if (enlace && CONTENT_CACHE.has(enlace)) {
        const cached = CONTENT_CACHE.get(enlace);
        setHtml(cached.html);
        setMeta(cached.meta);
        setCargando(false);
        return;
      }

      // Contenido preprocesado (Mongo)
      const contenidoMongo = (item.contenidoHTML || item.html || item.contenido || "").trim();
      if (contenidoMongo) {
        let img = baseMeta.imagen;
        if (isBadImg(img) && isHttp(enlace)) {
          const og = await getOgImage(enlace, { signal: abort.signal });
          if (og) img = og;
        }
        const finalHtml = rewriteHtml(contenidoMongo, enlace);
        const metaOk = { ...baseMeta, imagen: img || FALLBACK_IMG };
        setHtml(finalHtml);
        setMeta(metaOk);
        if (enlace) CONTENT_CACHE.set(enlace, { html: finalHtml, meta: metaOk });
        setCargando(false);
        return;
      }

      // Extracción en vivo
      if (isHttp(enlace)) {
        try {
          let full = await getContenidoNoticia({ url: enlace, lang: "es", full: 1, signal: abort.signal });
          if (!full?.html && !full?.bodyHtml) {
            try {
              const retry = await getContenidoNoticia({
                url: enlace,
                lang: "es",
                full: 1,
                mode: "aggressive",
                signal: abort.signal,
              });
              if (retry?.html || retry?.bodyHtml) full = retry;
            } catch {}
          }

          let contenidoHtml = full?.html || full?.bodyHtml || "";
          if (!contenidoHtml && full?.texto) contenidoHtml = `<p>${String(full.texto)}</p>`;

          let img = full?.imagen || full?.image || baseMeta.imagen || "";
          if (isBadImg(img)) {
            const og = await getOgImage(enlace, { signal: abort.signal });
            if (og) img = og;
          }

          const finalHtml = rewriteHtml(contenidoHtml, enlace);
          const metaOk = {
            titulo: full?.titulo || full?.title || baseMeta.titulo,
            imagen: img || FALLBACK_IMG,
            fuente: full?.fuente || baseMeta.fuente,
            fecha: full?.fecha || baseMeta.fecha,
          };

          setHtml(finalHtml);
          setMeta(metaOk);
          if (enlace) CONTENT_CACHE.set(enlace, { html: finalHtml, meta: metaOk });
          setCargando(false);
          return;
        } catch {}
      }

      // Fallback a resumen
      let img = baseMeta.imagen;
      if (isBadImg(img) && isHttp(enlace)) {
        const og = await getOgImage(enlace, { signal: abort.signal });
        if (og) img = og;
      }
      const metaOk = { ...baseMeta, imagen: img || FALLBACK_IMG };
      setHtml("");
      setMeta(metaOk);
      if (enlace) CONTENT_CACHE.set(enlace, { html: "", meta: metaOk });
      setCargando(false);
    })();

    return () => abort.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, enlace]);

  // Prepara el texto completo cuando cambie html/meta
  useEffect(() => {
    const texto =
      (meta.titulo ? meta.titulo + ". " : "") +
      (html ? htmlToPlainText(html) : item?.resumen || item?.description || "");
    fullTextRef.current = texto;
    charIndexRef.current = 0;
  }, [html, meta, item]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && (stopSpeech(), onClose?.());
    hasWindow && window.addEventListener("keydown", onKey);
    return () => hasWindow && window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => { if (!open) stopSpeech(); }, [open]);

  /* ---------- TTS robusto ---------- */
  function attachUtterEvents(u) {
    u.onboundary = (ev) => {
      if (typeof ev.charIndex === "number") charIndexRef.current = ev.charIndex;
    };
    u.onend = () => setVoiceState("idle");
    u.onerror = () => setVoiceState("idle");
  }

  function buildUtter(fromIndex = 0) {
    const texto = fullTextRef.current || "";
    const slice = texto.slice(Math.max(0, fromIndex));
    if (!slice) return null;

    const u = new SpeechSynthesisUtterance(slice);
    const voces = (hasWindow && window.speechSynthesis?.getVoices()) || [];
    const prefer = voces.find((v) => /es-|spanish|español/i.test(v.lang || v.name || ""));
    if (prefer) u.voice = prefer;
    u.lang = prefer?.lang || "es-PE";
    u.rate = 1;
    u.pitch = 1;

    attachUtterEvents(u);
    utterRef.current = u;
    return u;
  }

  function stopSpeech() {
    try { if (hasWindow && window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
    setVoiceState("idle");
    utterRef.current = null;
    // charIndexRef se conserva para reanudar manual si fuera necesario
  }

  function startFromBeginning() {
    // Fallback si no hay Web Speech
    if (!hasWindow || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      if (reproducirVozVaronil) {
        setVoiceState("playing");
        reproducirVozVaronil(fullTextRef.current, {
          lang: "es-PE",
          onFinish: () => setVoiceState("idle"),
        }).catch(() => setVoiceState("idle"));
      }
      return;
    }
    const synth = window.speechSynthesis;
    charIndexRef.current = 0;
    synth.cancel();
    const u = buildUtter(0);
    if (!u) { setVoiceState("idle"); return; }
    setVoiceState("playing");
    synth.speak(u);
  }

  function pauseSpeech() {
    try {
      if (hasWindow && window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setVoiceState("paused");
        return;
      }
    } catch {}
    // fallback sin pausa nativa
    setVoiceState("paused");
  }

  function resumeSpeech() {
    if (!hasWindow || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const synth = window.speechSynthesis;

    if (synth.paused) {
      synth.resume();
      setVoiceState("playing");
      return;
    }

    // Reanudación manual (algunos navegadores cancelan al pausar)
    const startIndex = charIndexRef.current || 0;
    synth.cancel();
    const u = buildUtter(startIndex);
    if (!u) { setVoiceState("idle"); return; }
    setVoiceState("playing");
    synth.speak(u);
  }

  function restartSpeech() {
    startFromBeginning();
  }

  /* ---------- Render ---------- */
  if (!open || !item) return null;

  const titulo = meta.titulo || item.titulo || item.title || "(Sin título)";
  const imagen = meta.imagen || item.imagen || item.image || item.urlToImage || "";
  const fuente = meta.fuente || item.fuente || item.source?.name || item.source || "—";
  const fecha = meta.fecha || item.fecha || item.publishedAt || null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          stopSpeech();
          onClose?.();
        }
      }}
    >
      <div
        className="w-full max-w-[1100px] h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ fontSize: `${fontScale}rem` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header fijo con contraste */}
        <div className="sticky top-0 z-10 px-3 sm:px-5 py-3 flex items-start gap-2 sm:gap-3 blx-modal-header">
          <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2 flex-1">{titulo}</h3>

          <div className="flex items-center gap-2">
            {/* tamaño de fuente */}
            <button
              onClick={() => setFontScale((v) => Math.max(0.95, +(v - 0.1).toFixed(2)))}
              className="px-2 py-1 rounded-md border border-white/50 text-white text-sm"
              title="A−"
            >
              A−
            </button>
            <button
              onClick={() => setFontScale((v) => Math.min(1.6, +(v + 0.1).toFixed(2)))}
              className="px-2 py-1 rounded-md border border-white/50 text-white text-sm"
              title="A+"
            >
              A+
            </button>

            {/* voz: botones separados */}
            <button
              onClick={startFromBeginning}
              disabled={voiceState === "playing"}
              className={`px-2 py-1 rounded-md text-sm font-semibold ${
                voiceState === "playing" ? "bg-white/30 text-white/70 cursor-not-allowed" : "bg-white text-[#b03a1a]"
              }`}
              title="Iniciar desde el inicio"
            >
              ▶ Iniciar
            </button>

            <button
              onClick={pauseSpeech}
              disabled={voiceState !== "playing"}
              className={`px-2 py-1 rounded-md text-sm font-semibold ${
                voiceState !== "playing" ? "bg-white/30 text-white/70 cursor-not-allowed" : "bg-white/10 text-white"
              }`}
              title="Pausar lectura"
            >
              ⏸ Pausar
            </button>

            <button
              onClick={resumeSpeech}
              disabled={voiceState !== "paused"}
              className={`px-2 py-1 rounded-md text-sm font-semibold ${
                voiceState !== "paused" ? "bg-white/30 text-white/70 cursor-not-allowed" : "bg-white/10 text-white"
              }`}
              title="Reanudar donde se pausó"
            >
              ▶ Reanudar
            </button>

            <button
              onClick={restartSpeech}
              disabled={voiceState === "idle" && !fullTextRef.current}
              className={`px-2 py-1 rounded-md text-sm font-semibold ${
                voiceState === "idle" && !fullTextRef.current
                  ? "bg-white/30 text-white/70 cursor-not-allowed"
                  : "bg-white/10 text-white"
              }`}
              title="Reiniciar desde el inicio"
            >
              ↻ Reiniciar
            </button>

            <button
              onClick={() => {
                stopSpeech();
                onClose?.();
              }}
              className="ml-1 text-white text-xl font-bold leading-none hover:scale-110 transition"
              aria-label="Cerrar"
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Sub-meta */}
        <div className="px-4 sm:px-6 py-2 text-xs text-[#6b4d3e] flex flex-wrap gap-3">
          {fuente && (
            <span>
              Fuente: <b>{fuente}</b>
            </span>
          )}
          {fecha && <span>{new Date(fecha).toLocaleString("es-PE")}</span>}
          {isHttp(enlace) && (
            <a
              href={enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto bg-[#b03a1a] text-white px-3 py-1 rounded-md font-semibold hover:bg-[#a63a1e]"
            >
              Ver fuente
            </a>
          )}
        </div>

        {/* Contenido scrolleable (incluye imagen) */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 pb-6 max-w-3xl mx-auto">
            {imagen && (
              <div className="w-full bg-[#f6f2ee] rounded-lg overflow-hidden mb-4">
                <img
                  src={proxify(imagen)}
                  alt={titulo}
                  className="w-full h-auto object-contain"
                  onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {cargando ? (
              <p className="text-sm text-gray-500">Extrayendo contenido…</p>
            ) : html ? (
              <div
                className="prose prose-sm sm:prose max-w-none prose-img:rounded-lg prose-a:text-[#b03a1a]"
                style={{ textAlign: "justify" }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-[#3a2a24]" style={{ textAlign: "justify" }}>
                {item.resumen || item.description || "Sin contenido."}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => {
                  stopSpeech();
                  onClose?.();
                }}
                className="px-4 py-2 rounded-lg bg-[#b03a1a] text-white font-semibold hover:bg-[#a63a1e]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos: contraste y legibilidad */}
      <style>{`
        .blx-modal-header{
          background:#b03a1a;
          color:#fff !important;
          box-shadow: inset 0 -1px 0 rgba(255,255,255,.08);
        }
        .blx-modal-header *{ color:#fff !important; }
        .prose p, .prose li, .prose td, .prose th { font-size: 1.05em; line-height: 1.8; }
        .prose h1{ font-size:1.6em; }
        .prose h2{ font-size:1.4em; }
        .prose h3{ font-size:1.25em; }
      `}</style>
    </div>
  );
}
