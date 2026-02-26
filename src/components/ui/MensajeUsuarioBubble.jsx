// ============================================================================
// 💬 MensajeUsuario — Nota humana editorial (Enterprise Legal)
// ----------------------------------------------------------------------------
// ✔ Sin burbuja
// ✔ Sin fondo
// ✔ Alineado derecha
// ✔ Densidad editorial
// ✔ Adjuntos discretos (inline)
// ============================================================================

import React from "react";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType,
  Link as LinkIcon,
} from "lucide-react";

/* ------------------------------------------------------------
   Inferencia de tipo de adjunto
------------------------------------------------------------ */
function inferKind(adj) {
  if (!adj) return "other";

  const n = (adj.name || "").toLowerCase();
  const t = (adj.type || "").toLowerCase();

  if (t.startsWith("image/")) return "image";
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (t.includes("excel") || n.endsWith(".xls") || n.endsWith(".xlsx"))
    return "excel";
  if (t.includes("word") || n.endsWith(".doc") || n.endsWith(".docx"))
    return "word";
  if (adj.url) return "url";

  return "other";
}

function AdjuntoInline({ adj }) {
  const kind = inferKind(adj);

  const iconMap = {
    image: <FileImage size={16} />,
    pdf: <FileText size={16} />,
    excel: <FileSpreadsheet size={16} />,
    word: <FileType size={16} />,
    url: <LinkIcon size={16} />,
    other: <FileType size={16} />,
  };

  const label = adj.name || adj.url || "Archivo adjunto";

  if (kind === "url") {
    return (
      <a
        href={adj.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition"
      >
        {iconMap[kind]}
        <span className="truncate underline">{label}</span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      {iconMap[kind]}
      <span className="truncate">{label}</span>
    </div>
  );
}

export default function MensajeUsuarioBubble({
  message,
  texto,
  adjuntos,
}) {
  // ------------------------------------------------------------
  // Normalización robusta
  // ------------------------------------------------------------

  const normalizedTexto =
    texto ??
    message?.texto ??
    message?.content ??
    message?.text ??
    message?.message ??
    "";

  const normalizedAdjuntos =
    adjuntos ??
    message?.adjuntos ??
    message?.attachments ??
    [];

  const hasAdjuntos =
    Array.isArray(normalizedAdjuntos) &&
    normalizedAdjuntos.length > 0;

  if (!normalizedTexto && !hasAdjuntos) return null;

  return (
    <div className="flex mb-10">
      <div className="ml-auto max-w-[70%] space-y-4 text-right">

        {/* TEXTO */}
        {normalizedTexto && (
          <div className="text-[15px] md:text-[16px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {normalizedTexto}
          </div>
        )}

        {/* ADJUNTOS INLINE */}
        {hasAdjuntos && (
          <div className="flex flex-col gap-2 items-end pt-2 border-t border-neutral-200/60">
            {normalizedAdjuntos.map((adj, idx) => (
              <AdjuntoInline key={idx} adj={adj} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}