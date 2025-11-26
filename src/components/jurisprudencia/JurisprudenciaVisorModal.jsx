// src/components/jurisprudencia/JurisprudenciaVisorModal.jsx
// ============================================================
// 🦉 BúhoLex | Visor de Jurisprudencia (modal de detalles + LitisBot)
// - Muestra datos esenciales, resumen amplio y acciones claras
// - Sin visor PDF embebido, sin TTS
// - Botones: abrir PDF oficial + consultar con LitisBot
// - Bloquea scroll del body cuando está abierto
// ============================================================

import React, { useEffect, useMemo, useState } from "react";

const IS_BROWSER = typeof window !== "undefined";

export default function JurisprudenciaVisorModal({
  open,
  doc,
  onClose,
  onPreguntarConJuris, // opcional: dispara LitisBot con esta sentencia
}) {
  const [isMobile, setIsMobile] = useState(false);

  // --- Detectar móvil vs desktop (solo para ajustar layout) ---
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

      organo: doc.organo || doc.sala || doc.salaSuprema,
      especialidad: doc.especialidad || doc.materia,
      tema: doc.tema,
      subtema: doc.subtema,
      estado: doc.estado,
      fuente: doc.fuente || "Poder Judicial",
      fuenteUrl: doc.fuenteUrl || doc.enlaceOficial,
      fechaScraping: doc.fechaScraping,

      baseLegal: doc.baseLegal || "",
      parteResolutiva: doc.parteResolutiva || "",

      // URL oficial / normalizada de resolución (para abrir en nueva pestaña)
      urlResolucion:
        doc.pdfUrl ||
        doc.pdfOficialUrl ||
        doc.urlResolucion ||
        doc.enlaceOficial ||
        doc.fuenteUrl,
    };
  }, [doc]);

  const tieneInfoDetallada = useMemo(() => {
    if (!data) return false;
    return Boolean(
      data.resumen ||
        data.sumilla ||
        data.baseLegal ||
        data.parteResolutiva ||
        (Array.isArray(data.palabrasClave) && data.palabrasClave.length > 0)
    );
  }, [data]);

  const isSoloBasica = data && !tieneInfoDetallada;

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

  if (!open || !data) return null;

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

  const puedeAbrirPdf = !!data.urlResolucion;

  function handleClose() {
    onClose?.();
  }

  function handleAbrirPdf() {
    if (!puedeAbrirPdf || !IS_BROWSER) return;
    window.open(data.urlResolucion, "_blank", "noopener,noreferrer");
  }

  // ======================================================================
  // RENDER
  // ======================================================================

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/30 px-2 sm:px-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`w-full ${
          isMobile ? "max-w-md h-[90vh]" : "max-w-[1080px] h-[86vh]"
        } max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
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

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 text-lg hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Cerrar visor"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 touch-pan-y overscroll-contain">
          {isSoloBasica && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] sm:text-xs text-amber-900">
              Esta resolución todavía no tiene ficha completa cargada en el
              repositorio interno de BúhoLex. Por ahora solo está disponible la
              información básica (expediente, órgano, especialidad y fechas).
            </div>
          )}

          <div className="grid gap-5 md:gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* Columna izquierda: datos + resumen amplio */}
            <div className="space-y-4">
              {/* Datos principales */}
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

              {/* Resumen amplio / Sumilla */}
              {data.resumen && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Resumen ampliado
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.resumen}
                  </p>
                </section>
              )}

              {!data.resumen && data.sumilla && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-1.5">
                    Sumilla
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.sumilla}
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
                    Parte resolutiva (extracto)
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {data.parteResolutiva}
                  </p>
                </section>
              )}
            </div>

            {/* Columna derecha: acciones + enlaces */}
            <div className="space-y-4">
              {/* Bloque acciones principales */}
              <section className="rounded-xl border border-amber-200 bg-[#fff7ec] px-3 sm:px-4 py-3 text-xs sm:text-[13px] text-slate-700">
                <p className="text-[12px] sm:text-sm font-semibold text-amber-900 mb-1.5">
                  Acciones rápidas
                </p>

                <div className="flex flex-col gap-2">
                  {onPreguntarConJuris && (
                    <button
                      type="button"
                      onClick={() => onPreguntarConJuris(doc)}
                      className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs sm:text-sm font-semibold text-amber-900 hover:bg-amber-100 transition"
                    >
                      Consultar con LitisBot esta sentencia
                    </button>
                  )}

                  {puedeAbrirPdf && (
                    <button
                      type="button"
                      onClick={handleAbrirPdf}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
                    >
                      Abrir / descargar PDF oficial
                    </button>
                  )}

                  {enlaceOficial && (
                    <a
                      href={enlaceOficial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    >
                      Ver ficha completa en el sitio oficial
                    </a>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  El análisis y el resumen son de BúhoLex. Para efectos
                  probatorios siempre prevalece la resolución oficial en PDF.
                </p>
              </section>

              {/* Estado / notas internas */}
              {data.estado && (
                <section className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] sm:text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">
                    Estado de la resolución:
                  </span>{" "}
                  {data.estado}
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
