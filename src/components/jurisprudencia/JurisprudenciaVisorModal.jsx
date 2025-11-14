// src/components/jurisprudencia/JurisprudenciaVisorModal.jsx
// ============================================================
// 🦉 BúhoLex | Visor de Jurisprudencia (modal + TTS + ficha completa)
// - Modal centrado, altura fija y scroll interno
// - Bloquea el scroll del body SOLO cuando hay modal visible
// - Preparado para el modelo REAL de Jurisprudencia (Fase A)
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  reproducirVozVaronil,
  pauseVoz,
  resumeVoz,
  stopVoz,
} from "@/services/vozService";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

export default function JurisprudenciaVisorModal({ open, doc, onClose }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // -------- Normalización de campos (compatibilidad vieja/nueva) --------
  const data = useMemo(() => {
    if (!doc) return null;

    return {
      titulo: doc.titulo || doc.nombre || "Resolución judicial",
      numeroExpediente: doc.numeroExpediente || doc.numero || doc.expediente,
      fechaResolucion: doc.fechaResolucion || doc.fecha,
      salaSuprema: doc.salaSuprema || doc.sala || doc.organo,
      tipoResolucion: doc.tipoResolucion || doc.tipo,
      pretensionDelito: doc.pretensionDelito || doc.pretension || doc.delito,
      normaDerechoInterno: doc.normaDerechoInterno || doc.norma || "",
      sumilla: doc.sumilla,
      resumen: doc.resumen,
      palabrasClave: doc.palabrasClave, // string o array
      urlResolucion:
        doc.urlResolucion || doc.pdfUrl || doc.enlaceOficial || doc.fuenteUrl,
      contenidoHTML: doc.contenidoHTML || doc.html || "",
      fundamentos: doc.fundamentos || "",
      baseLegal: doc.baseLegal || "",
      parteResolutiva: doc.parteResolutiva || "",
      organo: doc.organo || doc.sala || doc.salaSuprema,
      especialidad: doc.especialidad || doc.materia,
      tema: doc.tema,
      subtema: doc.subtema,
      estado: doc.estado,
      fuente: doc.fuente || "Poder Judicial",
      fuenteUrl: doc.fuenteUrl || doc.enlaceOficial,
      fechaScraping: doc.fechaScraping,
      texto: doc.texto, // fallback si no hay HTML
    };
  }, [doc]);

  // -------- Scroll lock del body (solo si hay modal visible) --------
  useEffect(() => {
    if (!open || !data) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open, data]);

  // -------- Texto que leerá el TTS --------
  const textoLector = useMemo(() => {
    if (!data) return "";
    const partes = [];

    if (data.titulo) partes.push(data.titulo);
    if (data.numeroExpediente)
      partes.push(`Expediente: ${data.numeroExpediente}`);
    if (data.pretensionDelito)
      partes.push(`Pretensión o delito: ${data.pretensionDelito}`);
    if (data.sumilla) partes.push(`Sumilla: ${data.sumilla}`);
    if (data.parteResolutiva)
      partes.push(`Parte resolutiva: ${data.parteResolutiva}`);
    else if (data.resumen) partes.push(`Resumen: ${data.resumen}`);

    return partes.join(". ");
  }, [data]);

  // -------- Reset de audio al cerrar/cambiar doc/open --------
  useEffect(() => {
    if (!open || !data) {
      stopVoz();
      setHasStarted(false);
      setIsPlaying(false);
      setIsPaused(false);
      return;
    }
    setHasStarted(false);
    setIsPlaying(false);
    setIsPaused(false);
  }, [open, data]);

  if (!open || !data) return null;

  // -------- Handlers de audio --------
  async function handleStart() {
    try {
      if (!textoLector) return;
      await reproducirVozVaronil(textoLector, { voz: "masculina_profesional" });
      setHasStarted(true);
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error("[VisorJuris] Error al iniciar voz:", err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }

  function handlePause() {
    try {
      pauseVoz();
      setIsPlaying(false);
      setIsPaused(true);
    } catch (err) {
      console.error("[VisorJuris] Error al pausar voz:", err);
    }
  }

  function handleResume() {
    try {
      resumeVoz();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error("[VisorJuris] Error al reanudar voz:", err);
    }
  }

  async function handleRestart() {
    try {
      if (!textoLector) return;
      stopVoz();
      await reproducirVozVaronil(textoLector, { voz: "masculina_profesional" });
      setHasStarted(true);
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      console.error("[VisorJuris] Error al reiniciar voz:", err);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }

  function handleClose() {
    try {
      stopVoz();
    } finally {
      setHasStarted(false);
      setIsPlaying(false);
      setIsPaused(false);
      onClose?.();
    }
  }

  // -------- Helpers UI --------
  const palabrasClaveTexto = Array.isArray(data.palabrasClave)
    ? data.palabrasClave.join(", ")
    : data.palabrasClave || "";

  const fechaResolucionTexto = data.fechaResolucion
    ? new Date(data.fechaResolucion).toLocaleDateString("es-PE")
    : "";

  const fechaScrapingTexto = data.fechaScraping
    ? new Date(data.fechaScraping).toLocaleString("es-PE")
    : "";

  const enlaceOficial =
    data.fuenteUrl || data.urlResolucion || doc?.enlaceOficial || null;

  // -------- Render --------
  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/30 px-3 sm:px-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Contenedor del modal: altura fija + scroll interno */}
      <div className="w-full max-w-6xl h-[80vh] max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-snug">
              {data.titulo}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
              {data.especialidad && (
                <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5">
                  {data.especialidad}
                </span>
              )}
              {data.organo && (
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5">
                  {data.organo}
                </span>
              )}
              {data.tipoResolucion && (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5">
                  {data.tipoResolucion}
                </span>
              )}
              {fechaResolucionTexto && (
                <span className="rounded-full bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5">
                  {fechaResolucionTexto}
                </span>
              )}
              {data.numeroExpediente && (
                <span className="rounded-full bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5">
                  Exp. {data.numeroExpediente}
                </span>
              )}
              {data.fuente && (
                <span className="rounded-full bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5">
                  Fuente: {data.fuente}
                </span>
              )}
            </div>
          </div>

          {/* Controles de audio + cerrar */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] sm:text-xs font-medium text-amber-900 hover:bg-amber-200 transition disabled:opacity-40"
                disabled={!textoLector || hasStarted}
              >
                <span className="text-[13px]">🔊</span>
                Escuchar
              </button>
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
                disabled={!isPlaying}
              >
                Pausar
              </button>
              <button
                type="button"
                onClick={handleResume}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
                disabled={!isPaused}
              >
                Reanudar
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
                disabled={!hasStarted}
              >
                Reiniciar
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 text-lg hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Cerrar visor"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido con scroll interno (touch-friendly) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 touch-pan-y overscroll-contain">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {/* Columna izquierda: metadatos + texto clave */}
            <div className="space-y-4">
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-[13px] text-slate-600">
                {data.numeroExpediente && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Expediente:
                    </span>{" "}
                    {data.numeroExpediente}
                  </div>
                )}
                {data.tipoResolucion && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Tipo de resolución:
                    </span>{" "}
                    {data.tipoResolucion}
                  </div>
                )}
                {data.salaSuprema && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Sala / órgano:
                    </span>{" "}
                    {data.salaSuprema}
                  </div>
                )}
                {data.especialidad && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Especialidad:
                    </span>{" "}
                    {data.especialidad}
                  </div>
                )}
                {data.tema && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Tema:
                    </span>{" "}
                    {data.tema}
                  </div>
                )}
                {data.subtema && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Subtema:
                    </span>{" "}
                    {data.subtema}
                  </div>
                )}
                {fechaResolucionTexto && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Fecha de resolución:
                    </span>{" "}
                    {fechaResolucionTexto}
                  </div>
                )}
                {data.pretensionDelito && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Pretensión / delito:
                    </span>{" "}
                    {data.pretensionDelito}
                  </div>
                )}
                {data.normaDerechoInterno && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Norma de derecho interno:
                    </span>{" "}
                    {data.normaDerechoInterno}
                  </div>
                )}
                {data.fuente && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Fuente:
                    </span>{" "}
                    {data.fuente}
                  </div>
                )}
                {fechaScrapingTexto && (
                  <div>
                    <span className="font-semibold text-slate-700">
                      Fecha de incorporación:
                    </span>{" "}
                    {fechaScrapingTexto}
                  </div>
                )}
              </section>

              {data.sumilla && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Sumilla
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.sumilla}
                  </p>
                </section>
              )}

              {data.resumen && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Resumen
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.resumen}
                  </p>
                </section>
              )}

              {palabrasClaveTexto && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Palabras clave
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600">
                    {palabrasClaveTexto}
                  </p>
                </section>
              )}

              {data.baseLegal && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Base legal
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.baseLegal}
                  </p>
                </section>
              )}

              {data.parteResolutiva && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Parte resolutiva
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.parteResolutiva}
                  </p>
                </section>
              )}

              {enlaceOficial && (
                <section>
                  <a
                    href={enlaceOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2"
                  >
                    Ver en el sitio oficial
                  </a>
                </section>
              )}
            </div>

            {/* Columna derecha: PDF o contenido HTML/texto */}
            <div className="min-h-[220px] rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden flex flex-col">
              {data.urlResolucion ? (
                <iframe
                  title="PDF de jurisprudencia"
                  src={data.urlResolucion}
                  className="w-full h-full min-h-[260px] border-0"
                />
              ) : data.contenidoHTML ? (
                <div className="flex-1 overflow-auto px-4 py-3 touch-pan-y overscroll-contain">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Contenido de la resolución
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        data.contenidoHTML || "<p>Sin contenido disponible.</p>"
                      ),
                    }}
                  />
                </div>
              ) : data.texto ? (
                <div className="flex-1 overflow-auto px-4 py-3 touch-pan-y overscroll-contain">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Texto completo
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.texto}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-4 py-3">
                  <p className="text-xs sm:text-[13px] text-slate-500 text-center">
                    Sin contenido adjunto para visualización en el visor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
