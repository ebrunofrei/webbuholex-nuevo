// src/components/jurisprudencia/JurisprudenciaVisorModal.jsx
// ============================================================
// 🦉 BúhoLex | Visor de Jurisprudencia (modal de detalles + LitisBot)
// - Modal centrado (desktop) / bottom sheet (móvil)
// - Panel lateral tipo Westlaw/LLex
// - Tipografía y paddings afinados para lectura PRO
// - Scroll bloqueado en el fondo y activo SOLO en el modal
// ============================================================

import React, { useEffect } from "react";

// ------------------------------------------------------------
// Skeletons simples (solo Tailwind + animate-pulse)
// ------------------------------------------------------------
function SkeletonBadge({ width = "w-20" }) {
  return (
    <div
      className={`h-4 ${width} rounded-full bg-slate-200/70 animate-pulse`}
    />
  );
}

function SkeletonLine({ width = "w-full", className = "" }) {
  return (
    <div
      className={`h-3 rounded-full bg-slate-200/70 animate-pulse ${width} ${className}`}
    />
  );
}

function SkeletonParagraph({ lines = 3 }) {
  const arr = Array.from({ length: lines });
  return (
    <div className="space-y-2">
      {arr.map((_, idx) => (
        <div
          key={idx}
          className={`h-2.5 rounded-full bg-slate-200/70 animate-pulse ${
            idx === arr.length - 1 ? "w-2/3" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Normalizador de documento (shape homogéneo)
// ------------------------------------------------------------
function normalizeJurisDoc(raw = {}) {
  const id = raw._id || raw.id || raw.uuid || null;

  const titulo =
    raw.titulo ||
    raw.nombre ||
    raw.caso ||
    raw.tituloCorto ||
    "Resolución sin título";

  const numeroExpediente =
    raw.numeroExpediente || raw.numero || raw.expediente || raw.nroExpediente;

  const especialidad = raw.especialidad || raw.materia || raw.materiaTexto;

  const organo =
    raw.organo || raw.sala || raw.salaSuprema || raw.tribunal || raw.juzgado;

  const tipoResolucion = raw.tipoResolucion || raw.tipo || raw.claseResolucion;

  const fechaResolucion = raw.fechaResolucion || raw.fecha || raw.fechaEmision;

  const fuente = raw.fuente || "Poder Judicial";

  const sumilla =
    raw.resumen || raw.sumilla || raw.sumillaRaw || raw.resumenEjecutivo;

  let palabrasClave = "";
  if (Array.isArray(raw.palabrasClave)) {
    palabrasClave = raw.palabrasClave.join(", ");
  } else {
    palabrasClave =
      raw.palabrasClave || raw.palabrasClaveRaw || raw.keywords || "";
  }

  const urlPdf =
    raw.pdfUrlEfectivo ||
    raw.pdfUrl ||
    raw.pdfOficialUrl ||
    raw.urlResolucion ||
    raw.enlaceOficial ||
    raw.fuenteUrl ||
    "";

  const enlaceOficial =
    raw.enlaceOficial || raw.fuenteUrl || urlPdf || raw.url || "";

  const isFavorite =
    raw.isFavorite === true ||
    raw.esFavorito === true ||
    raw.favorito === true ||
    raw.favorite === true;

  return {
    id,
    titulo,
    numeroExpediente,
    especialidad,
    organo,
    tipoResolucion,
    fechaResolucion,
    fuente,
    sumilla,
    palabrasClave,
    urlPdf,
    enlaceOficial,
    isFavorite,
    _raw: raw,
  };
}

// ------------------------------------------------------------
// Componente principal
// ------------------------------------------------------------
export default function JurisprudenciaVisorModal({
  open,
  doc,
  onClose,
  onPreguntarConJuris,
  onFavoriteChange,
}) {
  // 🔒 Lock/unlock scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [open]);

  if (!open) return null;

  const isLoading = !doc || doc.loading;
  const safeDoc = doc || {};
  const norm = !isLoading ? normalizeJurisDoc(safeDoc) : null;

  const id = !isLoading ? norm.id : null;
  const titulo = !isLoading ? norm.titulo : "Cargando resolución…";
  const numeroExpediente = !isLoading ? norm.numeroExpediente : null;
  const especialidad = !isLoading ? norm.especialidad : null;
  const organo = !isLoading ? norm.organo : null;
  const tipoResolucion = !isLoading ? norm.tipoResolucion : null;
  const fechaResolucion = !isLoading ? norm.fechaResolucion : null;
  const fuente = !isLoading ? norm.fuente : null;
  const sumilla = !isLoading ? norm.sumilla : null;
  const palabrasClave = !isLoading ? norm.palabrasClave : "";
  const urlPdf = !isLoading ? norm.urlPdf : "";
  const enlaceOficial = !isLoading ? norm.enlaceOficial : "";
  const isFavorite = !isLoading ? norm.isFavorite : false;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleAbrirPdf = () => {
    if (!urlPdf) return;
    window.open(urlPdf, "_blank", "noopener,noreferrer");
  };

  const handleFavoriteToggle = () => {
    if (!id || typeof onFavoriteChange !== "function") return;
    onFavoriteChange(id, !isFavorite, norm._raw);
  };

  const handlePreguntar = (promptExtra) => {
  if (!onPreguntarConJuris || isLoading) return;

  const fullText = norm?.sumilla || norm?.titulo || "Analiza esta sentencia.";
  const textoFinal = promptExtra
    ? `${promptExtra}\n\n${fullText}`
    : `Analiza esta sentencia:\n\n${fullText}`;

  onPreguntarConJuris(norm._raw || safeDoc, textoFinal);
};

  return (
    <div
      className="
        fixed inset-0 z-[60]
        flex items-end md:items-center justify-center
        bg-black/40 md:bg-black/50
        backdrop-blur-[2px]
        px-3 sm:px-5 py-4 md:py-8
      "
      aria-modal="true"
      role="dialog"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full bg-white
          max-w-5xl lg:max-w-[1100px]
          max-h-[92vh]
          rounded-t-2xl md:rounded-2xl
          shadow-[0_20px_55px_rgba(15,23,42,0.6)]
          flex flex-col overflow-hidden
          mx-auto
          text-[13px] leading-relaxed
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 sm:px-6 py-3.5 sm:py-4.5">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <>
                <div className="mb-2 h-3.5 w-44 rounded-full bg-slate-200/70 animate-pulse" />
                <div className="h-4 w-72 rounded-full bg-slate-200/80 animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1.5">
                  Jurisprudencia seleccionada
                </p>
                <h2 className="text-[15px] sm:text-[17px] md:text-[18px] font-semibold text-slate-900 leading-snug">
                  {titulo}
                </h2>
              </>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
              {isLoading ? (
                <>
                  <SkeletonBadge width="w-24" />
                  <SkeletonBadge width="w-32" />
                  <SkeletonBadge width="w-20" />
                </>
              ) : (
                <>
                  {especialidad && (
                    <span className="inline-flex items-center rounded-full bg-[#5C2E0B] px-2.5 py-0.5 font-semibold text-[10px] text-white shadow-sm">
                      {especialidad}
                    </span>
                  )}

                  {organo && (
                    <span className="inline-flex items-center rounded-full border border-[#5C2E0B]/40 bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#5C2E0B]">
                      {organo}
                    </span>
                  )}

                  {tipoResolucion && (
                    <span className="inline-flex items-center rounded-full border border-[#b91c1c]/30 bg-[#b91c1c]/5 px-2.5 py-0.5 text-[10px] font-semibold text-[#b91c1c]">
                      {tipoResolucion}
                    </span>
                  )}

                  {numeroExpediente && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Exp. {numeroExpediente}
                    </span>
                  )}

                  {fechaResolucion && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {fechaResolucion}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Controles del header: Favorito + Cerrar */}
          <div className="flex flex-col items-end gap-1.5">
            {onFavoriteChange && (
              <button
                type="button"
                onClick={handleFavoriteToggle}
                disabled={isLoading || !id}
                className={`
                  inline-flex items-center justify-center
                  h-8 px-3 rounded-full text-[11px] font-semibold
                  border transition
                  ${
                    isLoading || !id
                      ? "border-slate-200 text-slate-300 cursor-not-allowed"
                      : isFavorite
                      ? "border-[#b91c1c] bg-[#b91c1c]/10 text-[#b91c1c] hover:bg-[#b91c1c]/15"
                      : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                  }
                `}
                aria-label="Guardar en favoritos"
              >
                <span className="mr-1 text-xs">
                  {isFavorite ? "★" : "☆"}
                </span>
                <span className="hidden sm:inline">
                  {isFavorite ? "En favoritos" : "Guardar"}
                </span>
                <span className="sm:hidden">Fav</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 text-lg hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Cerrar visor"
            >
              ×
            </button>
          </div>
        </header>

        {/* BODY + PANEL LATERAL (scroll interno) */}
        <div className="flex-1 flex flex-col md:flex-row bg-white overflow-y-auto">
          {/* COLUMNA IZQUIERDA */}
          <div className="flex-1 px-4 sm:px-6 py-3.5 sm:py-4.5 space-y-4 sm:space-y-5">
            {/* Datos básicos */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[12px] sm:text-[13px] text-slate-700">
              {isLoading ? (
                <>
                  <SkeletonLine width="w-40" />
                  <SkeletonLine width="w-44" />
                  <SkeletonLine width="w-48" />
                  <SkeletonLine width="w-52" />
                </>
              ) : (
                <>
                  {numeroExpediente && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Expediente:
                      </span>{" "}
                      {numeroExpediente}
                    </div>
                  )}
                  {tipoResolucion && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Tipo de resolución:
                      </span>{" "}
                      {tipoResolucion}
                    </div>
                  )}
                  {organo && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Órgano / Sala:
                      </span>{" "}
                      {organo}
                    </div>
                  )}
                  {especialidad && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Especialidad:
                      </span>{" "}
                      {especialidad}
                    </div>
                  )}
                  {fechaResolucion && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Fecha:
                      </span>{" "}
                      {fechaResolucion}
                    </div>
                  )}
                  {fuente && (
                    <div>
                      <span className="font-semibold text-slate-800">
                        Fuente:
                      </span>{" "}
                      {fuente}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Sumilla / resumen */}
            <section>
              {isLoading ? (
                <>
                  <div className="h-3 w-32 rounded-full bg-slate-200/80 animate-pulse mb-2" />
                  <SkeletonParagraph lines={4} />
                </>
              ) : sumilla ? (
                <>
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 mb-2">
                    Sumilla / resumen
                  </h3>
                  <p className="text-[13px] text-slate-700 leading-[1.7] whitespace-pre-line">
                    {sumilla}
                  </p>
                </>
              ) : null}
            </section>

            {/* Palabras clave */}
            <section>
              {isLoading ? (
                <>
                  <div className="h-3 w-28 rounded-full bg-slate-200/80 animate-pulse mb-2" />
                  <SkeletonLine width="w-64" />
                </>
              ) : palabrasClave ? (
                <>
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 mb-1.5">
                    Palabras clave
                  </h3>
                  <p className="text-[12px] sm:text-[13px] text-slate-600 leading-relaxed">
                    {palabrasClave}
                  </p>
                </>
              ) : null}
            </section>
          </div>

          {/* PANEL LATERAL */}
          <aside
            className="
              w-full md:w-72
              border-t border-slate-100 md:border-t-0 md:border-l
              bg-slate-50/80
              px-4 sm:px-4.5 py-3.5 sm:py-4
              flex flex-col gap-3.5
              text-[11px]
              shrink-0
            "
          >
            {/* IA LitisBot */}
            {onPreguntarConJuris && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-[#5C2E0B] uppercase tracking-[0.16em] text-[10px] mb-1">
                    IA LitisBot
                  </p>

                  <button
                    type="button"
                    onClick={() => !isLoading && handlePreguntar()}
                    disabled={isLoading}
                    className={`w-full inline-flex items-center justify-center rounded-full px-3.5 py-1.75 text-[11px] font-semibold text-white shadow-sm transform transition ${
                      isLoading
                        ? "bg-[#5C2E0B]/60 cursor-not-allowed"
                        : "bg-[#5C2E0B] hover:bg-[#4a2308] active:scale-[0.97]"
                    }`}
                  >
                    {isLoading ? "Preparando contexto…" : "Enviar a LitisBot"}
                  </button>
                </div>

                {/* Bloque 1: análisis base */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-600 mb-1">
                    Análisis base
                  </p>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Atajos para entender rápidamente la resolución:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Explica en lenguaje claro y técnico los fundamentos centrales de esta sentencia, indicando la ratio decidendi y cómo se aplica al caso."
                        )
                      }
                      disabled={isLoading}
                      className={`rounded-full border border-amber-300 bg-[#fff7ec] px-2.5 py-1.25 text-[10px] font-medium text-amber-900 transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-amber-50 active:scale-[0.96]"
                      }`}
                    >
                      Fundamentos clave
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Identifica los puntos críticos del caso y relaciona cada uno con la ratio decidendi de la sentencia, explicando por qué fueron determinantes para el fallo."
                        )
                      }
                      disabled={isLoading}
                      className={`rounded-full border border-amber-300 bg-[#fff7ec] px-2.5 py-1.25 text-[10px] font-medium text-amber-900 transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-amber-50 active:scale-[0.96]"
                      }`}
                    >
                      Puntos críticos vs ratio decidendi
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Indica en qué supuestos prácticos podría usarse esta sentencia como precedente, qué criterios deja fijados y qué límites tiene su aplicación."
                        )
                      }
                      disabled={isLoading}
                      className={`rounded-full border border-amber-300 bg-[#fff7ec] px-2.5 py-1.25 text-[10px] font-medium text-amber-900 transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-amber-50 active:scale-[0.96]"
                      }`}
                    >
                      Uso como precedente
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Elabora un modelo de recurso utilizando esta sentencia como sustento principal. Propón una estructura clara y cita expresamente los fundamentos relevantes."
                        )
                      }
                      disabled={isLoading}
                      className={`rounded-full border border-amber-300 bg-[#fff7ec] px-2.5 py-1.25 text-[10px] font-medium text-amber-900 transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-amber-50 active:scale-[0.96]"
                      }`}
                    >
                      Modelo de recurso (base)
                    </button>
                  </div>
                </div>

                {/* Bloque 2: Acciones PRO */}
                <div className="mt-1.5">
                  <p className="text-[10px] font-semibold text-slate-700 mb-1">
                    Acciones PRO
                  </p>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Usa esta sentencia como insumo directo:
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Redacta una DEMANDA CIVIL completa basada en esta sentencia, siguiendo estrictamente la estructura procesal peruana (encabezado, petitorio, hechos, fundamentos jurídicos, monto del petitorio, vía procedimental, medios probatorios, anexos y POR TANTO). Usa corchetes para los datos que falten."
                        )
                      }
                      disabled={isLoading}
                      className={`w-full rounded-full border border-[#5C2E0B]/20 bg-white px-3 py-1.5 text-[11px] text-[#5C2E0B] font-semibold text-left transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[#fdf7f2] active:scale-[0.98]"
                      }`}
                    >
                      Redacción de demanda PRO
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Formula un recurso de apelación civil/constitucional PRO contra una sentencia, utilizando esta resolución como sustento central. Estructura el recurso en agravios claros, desarrolla la crítica jurídica y cita expresamente los fundamentos relevantes."
                        )
                      }
                      disabled={isLoading}
                      className={`w-full rounded-full border border-[#5C2E0B]/20 bg-white px-3 py-1.5 text-[11px] text-[#5C2E0B] font-semibold text-left transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[#fdf7f2] active:scale-[0.98]"
                      }`}
                    >
                      Recurso de apelación civil/const. PRO
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Formula estrategias de defensa para mi patrocinado utilizando esta sentencia como sustento principal. Indica qué argumentos reforzar, qué hechos destacar y cómo emplear los fundamentos de la resolución para debilitar la tesis contraria."
                        )
                      }
                      disabled={isLoading}
                      className={`w-full rounded-full border border-[#5C2E0B]/20 bg-white px-3 py-1.5 text-[11px] text-[#5C2E0B] font-semibold text-left transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[#fdf7f2] active:scale-[0.98]"
                      }`}
                    >
                      Estrategias de defensa PRO
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        !isLoading &&
                        handlePreguntar(
                          "Realiza una crítica técnica de la sentencia: analiza motivación, suficiencia de fundamentos, posible incongruencia, razonabilidad de la decisión y riesgos de nulidad. Señala los puntos fuertes, los vicios posibles y cómo podrían ser atacados en un recurso."
                        )
                      }
                      disabled={isLoading}
                      className={`w-full rounded-full border border-[#5C2E0B]/20 bg-white px-3 py-1.5 text-[11px] text-[#5C2E0B] font-semibold text-left transition ${
                        isLoading
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[#fdf7f2] active:scale-[0.98]"
                      }`}
                    >
                      Crítica técnica de la sentencia
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Acceso rápido */}
            <div className="border-t border-slate-200/70 pt-3.5 mt-1 flex flex-col gap-2.25">
              <p className="font-semibold text-slate-700 text-[10px] uppercase tracking-[0.16em]">
                Acceso rápido
              </p>

              <div className="flex flex-col gap-1.5">
                {urlPdf && (
                  <button
                    type="button"
                    onClick={() => !isLoading && handleAbrirPdf()}
                    disabled={isLoading}
                    className={`w-full inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 py-1.75 text-[11px] font-semibold text-slate-800 transform transition ${
                      isLoading
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:bg-slate-50 active:scale-[0.97]"
                    }`}
                  >
                    Abrir / descargar PDF
                  </button>
                )}

                {enlaceOficial && (
                  <a
                    href={enlaceOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      inline-flex items-center justify-center
                      rounded-full border border-slate-200 bg-white
                      px-3.5 py-1.75 text-[11px] font-medium text-slate-700
                      hover:bg-slate-50 active:scale-[0.97]
                      transition
                    "
                  >
                    Ver en sitio oficial
                  </a>
                )}
              </div>
            </div>

            {/* Ficha técnica */}
            <div className="border-t border-slate-200/70 pt-3.5 mt-1">
              <p className="font-semibold text-slate-700 text-[10px] uppercase tracking-[0.16em] mb-2">
                Ficha técnica
              </p>

              {isLoading ? (
                <div className="space-y-1.75">
                  <SkeletonLine width="w-40" />
                  <SkeletonLine width="w-32" />
                  <SkeletonLine width="w-36" />
                </div>
              ) : (
                <dl className="space-y-1.5 text-[11px] text-slate-600">
                  {numeroExpediente && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">
                        Expediente:
                      </dt>
                      <dd className="text-right">{numeroExpediente}</dd>
                    </div>
                  )}
                  {organo && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">Órgano:</dt>
                      <dd className="text-right">{organo}</dd>
                    </div>
                  )}
                  {especialidad && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">
                        Especialidad:
                      </dt>
                      <dd className="text-right">{especialidad}</dd>
                    </div>
                  )}
                  {tipoResolucion && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">Tipo:</dt>
                      <dd className="text-right">{tipoResolucion}</dd>
                    </div>
                  )}
                  {fechaResolucion && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">Fecha:</dt>
                      <dd className="text-right">{fechaResolucion}</dd>
                    </div>
                  )}
                  {fuente && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-semibold text-slate-700">Fuente:</dt>
                      <dd className="text-right">{fuente}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>

            {/* Footer pequeño en panel */}
            <div className="mt-auto pt-3.5 border-t border-slate-200/70 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3.5 py-1.75 text-[11px] font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.97] transition"
              >
                Cerrar
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
