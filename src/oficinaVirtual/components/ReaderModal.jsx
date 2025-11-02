/* eslint-disable react/no-danger */
import React, { useEffect, useRef, useState } from "react";
import { proxifyMedia, getContenidoNoticia } from "@/services/noticiasClientService";

const FALLBACK_IMG = "/assets/default-news.jpg";

function proxifyHtml(html = "") {
  return html.replace(/(src|poster)=["'](https?:\/\/[^"']+)["']/gi, (_, attr, url) => {
    return `${attr}="${proxifyMedia(url)}"`;
  });
}

export default function ReaderModal({ open, item, onClose }) {
  const [loading, setLoading] = useState(false);
  const [contenido, setContenido] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!open || !item) return;

    setContenido(null);
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const enlace = item.enlace || item.url || item.link || "";
        const data = await getContenidoNoticia(enlace, { signal: ctrl.signal });
        const html = data?.html ? proxifyHtml(data.html) : "";

        setContenido({
          titulo: data?.titulo || item.titulo || "",
          fuente: data?.fuente || item.fuente || "",
          fecha:  data?.fecha  || item.fecha  || "",
          imagen: proxifyMedia(data?.imagen || item.imagen || ""),
          html,
          videos: Array.isArray(data?.videos) ? data.videos : [],
        });
      } catch {
        setContenido({
          titulo: item.titulo || "",
          fuente: item.fuente || "",
          fecha:  item.fecha  || "",
          imagen: proxifyMedia(item.imagen || ""),
          html: "",
          videos: [],
        });
      } finally {
        setLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
  }, [open, item]);

  if (!open || !item) return null;
  const verFuente = item.enlace || item.url || item.link;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
      >
        <div className="sticky top-0 bg-[#b03a1a] text-white px-4 sm:px-6 py-3 flex gap-3 items-start">
          <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">
            {contenido?.titulo || item.titulo}
          </h3>
          <button onClick={onClose} className="ml-auto text-white text-xl font-bold" aria-label="Cerrar">×</button>
        </div>

        <div className="overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="text-sm text-[#6b4d3e] flex flex-wrap gap-3">
            {(contenido?.fuente || item.fuente) && (
              <span>Fuente: <span className="font-semibold">{contenido?.fuente || item.fuente}</span></span>
            )}
            {(contenido?.fecha || item.fecha) && (
              <span>{new Date(contenido?.fecha || item.fecha).toLocaleString()}</span>
            )}
          </div>

          {(contenido?.imagen || item.imagen) && (
            <img
              src={proxifyMedia(contenido?.imagen || item.imagen)}
              alt={contenido?.titulo || item.titulo}
              className="w-full max-h-[60vh] object-contain bg-[#f6f2ee] rounded-lg"
              onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
              loading="lazy"
            />
          )}

          {!!contenido?.videos?.length && (
            <div className="space-y-3">
              {contenido.videos.map((v, i) => (
                <div key={i} className="w-full aspect-video">
                  <iframe
                    src={v}
                    title={`video-${i}`}
                    className="w-full h-full rounded-lg"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          )}

          <div className="prose prose-sm sm:prose max-w-none text-[#3a2a24]">
            {loading ? (
              <p className="text-center text-gray-500">Cargando contenido…</p>
            ) : contenido?.html ? (
              <div
                className="[&_*]:max-w-full [&_img]:rounded-md [&_img]:my-3 [&_img]:mx-auto"
                dangerouslySetInnerHTML={{ __html: contenido.html }}
              />
            ) : (
              <p className="whitespace-pre-line">{item.resumen || "Sin contenido."}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            {verFuente && /^https?:\/\//i.test(verFuente) && (
              <a
                href={verFuente}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#b03a1a] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#a87247]"
              >
                Ver en fuente
              </a>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-lg border font-semibold text-[#8a6e60]">
              Cerrar
            </button>
          </div>

          <p className="text-xs text-[#8a6e60]">
            Publicado y adaptado por el equipo jurídico de <strong>BúhoLex</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
