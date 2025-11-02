// src/components/ui/ReaderModal.jsx
/* eslint-disable react/no-danger */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getContenidoNoticia as getContenidoNoticiaSvc } from "@services/noticiasContenido.js";
import { proxifyMedia as proxifyMediaSvc } from "@services/noticiasClientService.js";

/* ---------- Helpers ---------- */
const FALLBACK_IMG = "/assets/default-news.jpg";
const hasWindow = typeof window !== "undefined";

const isHttp = (u) => /^https?:\/\//i.test(String(u || ""));
const isBadImg = (u = "") =>
  !u ||
  /bullet\.gif|placeholder|default|noimage|transparent|spacer/i.test(u) ||
  /^data:image\/gif/i.test(u);

/** Usa el proxy del backend para CORS/mixto si es URL remota */
const proxify = (u) => (isHttp(u) ? (proxifyMediaSvc ? proxifyMediaSvc(u) : `/api/media/proxy?url=${encodeURIComponent(u)}`) : u);

/** Intenta obtener og:image del backend para una URL externa. */
async function getOgImage(url, { signal } = {}) {
  try {
    if (!isHttp(url)) return "";
    const res = await fetch(`/api/media/meta?url=${encodeURIComponent(url)}`, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return "";
    const j = await res.json().catch(() => ({}));
    return j?.ogImage || "";
  } catch {
    return "";
  }
}

/** Normaliza y llama al servicio de extracción acepte string u objeto */
async function getContenidoNoticia(urlOrItem, opts = {}) {
  try {
    // si el servicio soporta objeto { url, ... }
    if (typeof urlOrItem === "object") {
      return await getContenidoNoticiaSvc({ ...(urlOrItem || {}), ...opts });
    }
    // si recibe string
    if (typeof urlOrItem === "string") {
      try {
        return await getContenidoNoticiaSvc({ url: urlOrItem, ...opts });
      } catch {
        // compat a implementaciones antiguas que aceptaban (url, opts)
        return await getContenidoNoticiaSvc(urlOrItem, opts);
      }
    }
  } catch {}
  return null;
}

export default function ReaderModal({ open, item, onClose }) {
  const [cargando, setCargando] = useState(false);
  const [html, setHtml] = useState("");
  const [meta, setMeta] = useState({});
  const overlayRef = useRef(null);

  const enlace = useMemo(() => item?.enlace || item?.url || item?.link || "", [item]);

  useEffect(() => {
    if (!open || !item) return;
    const abort = new AbortController();

    (async () => {
      setCargando(true);
      setHtml("");
      setMeta({});

      const baseMeta = {
        titulo: item.titulo || item.title || "",
        imagen: item.imagen || item.image || item.urlToImage || "",
        fuente: item.fuente || item.source?.name || "",
        fecha: item.fecha || item.publishedAt || null,
      };

      // 1) Si ya viene contenido completo (Mongo / preprocesado)
      const contenidoMongo = (item.contenido || "").trim();
      if (contenidoMongo) {
        let img = baseMeta.imagen;
        if (isBadImg(img) && isHttp(enlace)) {
          const og = await getOgImage(enlace, { signal: abort.signal });
          if (og) img = og;
        }
        setHtml(contenidoMongo);
        setMeta({ ...baseMeta, imagen: img || FALLBACK_IMG });
        setCargando(false);
        return;
      }

      // 2) Intentar extraer con el backend si hay enlace HTTP
      if (isHttp(enlace)) {
        try {
          // intento normal
          let full = await getContenidoNoticia({ url: enlace, lang: "es", full: 1, signal: abort.signal });
          // reintento agresivo si vino vacío
          if (!full?.html && !full?.bodyHtml) {
            try {
              const retry = await getContenidoNoticia({ url: enlace, lang: "es", full: 1, mode: "aggressive", signal: abort.signal });
              if (retry?.html || retry?.bodyHtml) full = retry;
            } catch {}
          }

          let contenidoHtml = full?.html || full?.bodyHtml || "";
          let img = full?.imagen || full?.image || baseMeta.imagen || "";

          if (isBadImg(img)) {
            const og = await getOgImage(enlace, { signal: abort.signal });
            if (og) img = og;
          }

          setHtml(contenidoHtml);
          setMeta({
            titulo: full?.titulo || full?.title || baseMeta.titulo,
            imagen: img || FALLBACK_IMG,
            fuente: full?.fuente || baseMeta.fuente,
            fecha: full?.fecha || baseMeta.fecha,
          });
          setCargando(false);
          return;
        } catch {
          // cae al resumen
        }
      }

      // 3) Fallback: solo resumen
      let img = baseMeta.imagen;
      if (isBadImg(img) && isHttp(enlace)) {
        const og = await getOgImage(enlace, { signal: abort.signal });
        if (og) img = og;
      }
      setHtml("");
      setMeta({ ...baseMeta, imagen: img || FALLBACK_IMG });
      setCargando(false);
    })();

    return () => abort.abort();
  }, [open, item, enlace]);

  // Cerrar con ESC y click fuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    hasWindow && window.addEventListener("keydown", onKey);
    return () => hasWindow && window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const titulo = meta.titulo || item.titulo || item.title || "";
  const imagen = meta.imagen || item.imagen || item.image || item.urlToImage || "";
  const fuente = meta.fuente || item.fuente || item.source?.name || "";
  const fecha = meta.fecha || item.fecha || item.publishedAt || null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        className="w-full max-w-[1100px] h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#b03a1a] to-[#e1683a] text-white px-4 sm:px-6 py-3 flex items-start gap-3">
          <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">{titulo}</h3>
          <button
            onClick={onClose}
            className="ml-auto text-white text-xl font-bold leading-none"
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 max-w-3xl mx-auto">
            <div className="text-xs text-[#6b4d3e] flex flex-wrap gap-3 mb-3">
              {fuente && <span>Fuente: <b>{fuente}</b></span>}
              {fecha && <span>{new Date(fecha).toLocaleString("es-PE")}</span>}
            </div>

            {imagen && (
              <img
                src={proxify(imagen)}
                alt={titulo}
                className="w-full object-cover rounded-lg max-h-[46vh] bg-[#f6f2ee] mb-4"
                onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
                loading="lazy"
              />
            )}

            {cargando ? (
              <p className="text-sm text-gray-500">Extrayendo contenido…</p>
            ) : html ? (
              <div
                className="prose prose-sm sm:prose lg:prose-lg max-w-none prose-img:rounded-lg prose-a:text-[#b03a1a]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-[#3a2a24] whitespace-pre-line">
                {item.resumen || item.description || "Sin contenido."}
              </p>
            )}

            {/* Acciones */}
            <div className="mt-6 flex flex-wrap gap-3">
              {isHttp(enlace) && (
                <a
                  href={enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#a63a1e]"
                >
                  Ver en fuente
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border font-semibold text-[#8a6e60]"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-4 text-[11px] text-[#8a6e60]">
              Publicado y adaptado por el equipo jurídico de <b>BúhoLex</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
