// src/components/jurisprudencia/JurisprudenciaVisorModal.jsx
// ============================================================
// 🦉 BúhoLex | Visor de Jurisprudencia (modal + TTS + ficha completa)
// - Desktop: ficha + PDF en dos columnas
// - Móvil: visor PDF casi a pantalla completa (detalles van en otro modal)
// - Bloquea scroll del body cuando está abierto
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  reproducirVozVaronil,
  pauseVoz,
  resumeVoz,
  stopVoz,
} from "@/services/vozService";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { joinApi } from "@/services/apiBase";

const IS_BROWSER = typeof window !== "undefined";

export default function JurisprudenciaVisorModal({
  open,
  doc,
  onClose,
  onPreguntarConJuris, // opcional: dispara LitisBot con esta sentencia
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // --- Detectar móvil vs desktop (simple pero efectivo) ---
  useEffect(() => {
    if (!IS_BROWSER) return;
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // -------- Normalización de campos --------
  const data = useMemo(() => {
    if (!doc) return null;

    return {
      id: doc.id || doc._id,

      titulo: doc.titulo || doc.nombre || "Resolución judicial",
      numeroExpediente: doc.numeroExpediente || doc.numero || doc.expediente,
      fechaResolucion: doc.fechaResolucion || doc.fecha,
      salaSuprema: doc.salaSuprema || doc.sala || doc.organo,
      tipoResolucion: doc.tipoResolucion || doc.tipo,
      pretensionDelito: doc.pretensionDelito || doc.pretension || doc.delito,
      normaDerechoInterno: doc.normaDerechoInterno || doc.norma || "",
      sumilla: doc.sumilla,
      resumen: doc.resumen,
      palabrasClave: doc.palabrasClave,

      urlResolucion:
        doc.pdfUrl ||
        doc.urlResolucion ||
        doc.enlaceOficial ||
        doc.fuenteUrl,

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
      texto: doc.texto || "",
    };
  }, [doc]);

  const hasDetalle = useMemo(() => {
    if (!data) return false;
    return Boolean(
      data.sumilla ||
        data.resumen ||
        data.fundamentos ||
        data.baseLegal ||
        data.parteResolutiva ||
        data.contenidoHTML ||
        data.texto
    );
  }, [data]);

  const isSoloBasica = data && !hasDetalle;

  // -------- Scroll lock del body --------
  useEffect(() => {
    if (!open || !data || !IS_BROWSER) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [open, data]);

  // -------- Texto que leerá el TTS (más humano, por bloques) --------
  const textoLector = useMemo(() => {
    if (!data) return "";
    const partes = [];

    if (data.titulo) {
      partes.push(`Título de la resolución: ${data.titulo}.`);
    }

    if (data.numeroExpediente || data.pretensionDelito || data.organo) {
      const meta = [];
      if (data.numeroExpediente)
        meta.push(`Expediente ${data.numeroExpediente}`);
      if (data.organo) meta.push(`órgano o sala: ${data.organo}`);
      if (data.pretensionDelito)
        meta.push(`materia o delito: ${data.pretensionDelito}`);
      partes.push(meta.join(". ") + ".");
    }

    if (data.sumilla) {
      partes.push(`Sumilla: ${data.sumilla}.`);
    } else if (data.resumen) {
      partes.push(`Resumen de la decisión: ${data.resumen}.`);
    }

    if (data.parteResolutiva) {
      partes.push(`En la parte resolutiva se decide lo siguiente: ${data.parteResolutiva}.`);
    }

    // Si tenemos texto completo, solo un fragmento inicial como lectura guiada
    if (data.texto && data.texto.trim().length > 0) {
      const fragmento = data.texto.trim().slice(0, 3000);
      partes.push(
        "A continuación, un fragmento relevante de la sentencia: " + fragmento
      );
    }

    return partes.join(" ");
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
      await reproducirVozVaronil(textoLector, {
        voz: "masculina_profesional",
      });
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
      await reproducirVozVaronil(textoLector, {
        voz: "masculina_profesional",
      });
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

  const hasPdf = !!data.urlResolucion;
  const pdfProxyUrl =
    data.id && hasPdf ? joinApi(`/api/jurisprudencia/${data.id}/pdf`) : null;

  const pdfInlineUrl = pdfProxyUrl
    ? `${pdfProxyUrl}#view=FitH&zoom=page-width`
    : data.urlResolucion || null;

  const pdfDownloadUrl = pdfProxyUrl
    ? `${pdfProxyUrl}?download=1`
    : data.urlResolucion || null;

  // ======================================================================
  // RENDER
  // ======================================================================

  // --- Header desktop (título + chips + TTS + cerrar) ---
  const headerDesktop = (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-800 leading-snug">
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
  );

  // --- Header móvil (solo audio + cerrar, sin título ni detalle) ---
  const headerMobile = (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 bg-white">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleStart}
          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-200 transition disabled:opacity-40"
          disabled={!textoLector || hasStarted}
        >
          <span className="text-[13px]">🔊</span>
          Escuchar
        </button>
        <button
          type="button"
          onClick={handlePause}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
          disabled={!isPlaying}
        >
          Pausar
        </button>
        <button
          type="button"
          onClick={handleResume}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
          disabled={!isPaused}
        >
          Reanudar
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
  );

  // ======================================================================
  // Vista móvil: SOLO PDF
  // ======================================================================
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[9990] flex flex-col bg-black/40 px-2 py-4"
        aria-modal="true"
        role="dialog"
      >
        <div className="mx-auto w-full max-w-md h-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {headerMobile}

          <div className="flex-1 w-full overflow-hidden bg-[#fdf7f2]">
            {hasPdf && pdfInlineUrl ? (
              <iframe
                title="PDF de jurisprudencia"
                src={pdfInlineUrl}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4">
                {data.contenidoHTML ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800 overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        data.contenidoHTML ||
                          "<p>Sin contenido disponible para visualizar.</p>"
                      ),
                    }}
                  />
                ) : data.texto ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.texto}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 text-center">
                    Sin PDF ni contenido disponible para el visor.
                  </p>
                )}
              </div>
            )}
          </div>

          {hasPdf && pdfDownloadUrl && (
            <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-[#e3c7a3] bg-[#fdf7f2]">
              <button
                type="button"
                onClick={() =>
                  window.open(pdfDownloadUrl, "_blank", "noopener,noreferrer")
                }
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
              >
                Abrir / descargar PDF oficial
              </button>
              {enlaceOficial && (
                <a
                  href={enlaceOficial}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] underline underline-offset-2 text-slate-500 hover:text-slate-700 whitespace-nowrap"
                >
                  Ver ficha en el sitio del PJ
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================================================================
  // Vista desktop / tablet (ficha + PDF)
  // ======================================================================
  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/30 px-2 sm:px-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-[1180px] h-[88vh] max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {headerDesktop}

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 touch-pan-y overscroll-contain">
          {isSoloBasica && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] sm:text-xs text-amber-900">
              Esta resolución todavía no tiene ficha completa cargada en el
              repositorio interno de BúhoLex. Por ahora solo está disponible la
              información básica (expediente, órgano, especialidad y fechas).
            </div>
          )}

          <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
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

              {onPreguntarConJuris && (
                <section>
                  <button
                    type="button"
                    onClick={() => onPreguntarConJuris(doc)}
                    className="w-full inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100 transition"
                  >
                    Consultar con LitisBot
                  </button>
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
                    Ver ficha en el sitio oficial
                  </a>
                </section>
              )}
            </div>

            {/* Columna derecha: visor PDF */}
            <div className="min-h-[260px] rounded-xl border border-[#cda27a]/60 bg-[#fdf7f2] overflow-hidden flex flex-col">
              {hasPdf && pdfInlineUrl ? (
                <>
                  <div className="flex-1 w-full overflow-hidden">
                    <iframe
                      title="PDF de jurisprudencia"
                      src={pdfInlineUrl}
                      className="w-full h-full min-h-[340px] md:min-h-[480px] border-0"
                    />
                  </div>

                  <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-[#fdf7f2] border-t border-[#e3c7a3]">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          pdfDownloadUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
                    >
                      Abrir / descargar PDF oficial
                    </button>

                    {enlaceOficial && (
                      <a
                        href={enlaceOficial}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] underline underline-offset-2 text-slate-500 hover:text-slate-700"
                      >
                        Ver ficha en el sitio del PJ
                      </a>
                    )}
                  </div>
                </>
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
