// ============================================================================
// 🦉 PdfBanner (Enterprise Edition – MultiPDF)
// ----------------------------------------------------------------------------
// Muestra los PDFs procesados como chips removibles.
// Compatible con análisis multiarchivo del Engine.
// ============================================================================

import React from "react";
import { X, FileText, AlertTriangle } from "lucide-react";

export default function PdfBanner({
  pdfContext = null,         // Objeto global combinado
  onRemovePdf = () => {},    // Remueve un archivo
}) {
  if (!pdfContext) return null;

  const { archivos = [] } = pdfContext;

  if (!archivos.length) return null;

  return (
    <div className="w-full bg-[#FFF7F2] border border-[#5C2E0B]/20 rounded-xl px-4 py-3 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-semibold text-[#5C2E0B]">
          Documentos PDF adjuntos
        </h3>

        <span className="text-xs text-[#5C2E0B]/70">
          {archivos.length} documento{archivos.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* LISTA DE CHIPS */}
      <div className="flex flex-wrap gap-2">
        {archivos.map((pdf, idx) => {
          const ok = pdf?.tokens || pdf?.jurisTextoBase;
          const label = pdf.nombreArchivo || `PDF #${idx + 1}`;

          return (
            <div
              key={pdf.uuid || idx}
              className="flex items-center gap-2 bg-[#5C2E0B]/10 text-[#5C2E0B] 
                         px-3 py-1.5 rounded-full text-[12px] max-w-[260px] overflow-hidden"
              title={label}
            >
              {/* Icono */}

              {ok ? (
                <FileText size={15} className="text-[#5C2E0B]" />
              ) : (
                <AlertTriangle size={15} className="text-red-600" />
              )}

              {/* Texto truncado */}
              <span className="truncate">
                {label} {pdf.paginas ? `(${pdf.paginas} págs.)` : ""}
              </span>

              {/* Botón remover */}
              <button
                onClick={() => onRemovePdf({ label })}
                className="ml-1 p-0.5 rounded-full hover:bg-[#8C4A1F]/20 transition"
                title="Quitar PDF"
              >
                <X size={14} className="text-[#8C4A1F]" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
