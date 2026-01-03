// src/components/litisbot/research/LRE_ContextStack.jsx
import React, { useState } from "react";
import {
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaFileAlt,
  FaInbox,
  FaTimesCircle,
} from "react-icons/fa";

/*
   ============================================================
   📚 LRE_ContextStack — “Inspector de Contexto”
   ------------------------------------------------------------
   Muestra todas las piezas activas del razonamiento:

     - Jurisprudencia seleccionada  
     - Documentos PDF procesados  
     - Notas doctrinales (futuro)  
     - Criterios marcados

   EVENTOS:
     • onRemove(item)
     • onFocus(item)
     • onClear()
   ============================================================
*/

export default function LRE_ContextStack({
  stack = [],
  onRemove,
  onFocus,
  onClear,
}) {
  const hasItems = Array.isArray(stack) && stack.length > 0;

  return (
    <div
      className="w-full flex flex-col gap-3 p-4 rounded-xl border shadow-sm"
      style={{ borderColor: "rgba(92,46,11,0.25)" }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-[16px] font-bold"
          style={{ color: "#5C2E0B" }}
        >
          Contexto activo
        </h2>

        {hasItems && (
          <button
            onClick={() => onClear?.()}
            className="flex items-center gap-1 text-[13px] px-3 py-1 rounded-lg font-semibold"
            style={{
              background: "#842029",
              color: "#ffffff",
            }}
            title="Vaciar contexto"
          >
            <FaTimesCircle />
            Limpiar
          </button>
        )}
      </div>

      {/* SIN ELEMENTOS */}
      {!hasItems && (
        <div className="flex flex-col items-center gap-2 py-6 opacity-70">
          <FaInbox size={26} className="text-[#5C2E0B]" />
          <p className="text-[14px] text-[#5C2E0B]">
            No hay documentos activos en el contexto.
          </p>
        </div>
      )}

      {/* LISTA DE ELEMENTOS */}
      <div className="flex flex-col gap-3">
        {stack.map((item) => (
          <ContextCard
            key={item.id}
            item={item}
            onRemove={onRemove}
            onFocus={onFocus}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   🎴 TARJETA INDIVIDUAL DEL CONTEXTO
   - Expandible
   - Muestra expediente, especialidad y sumilla
   ============================================================ */

function ContextCard({ item, onRemove, onFocus }) {
  const [open, setOpen] = useState(false);

  const isJuris = item.tipo === "juris";
  const isPDF = item.tipo === "pdf";

  return (
    <div
      className="rounded-xl border p-3 shadow-sm transition cursor-pointer"
      style={{ borderColor: "rgba(92,46,11,0.25)" }}
      onClick={() => onFocus?.(item)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold text-[15px] leading-tight"
            style={{ color: "#5C2E0B" }}
          >
            {isJuris && (item.titulo || item.nombre || item.sumilla)}
            {isPDF && item.filename}
          </p>

          {isJuris && item.numeroExpediente && (
            <p className="text-[12px] opacity-70 text-[#5C2E0B]">
              Exp. {item.numeroExpediente}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÓN EXPANDIR */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="text-[#5C2E0B] active:scale-95"
            title={open ? "Contraer" : "Ver detalles"}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </button>

          {/* BOTÓN ELIMINAR */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(item);
            }}
            className="text-[#842029] active:scale-95"
            title="Quitar del contexto"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {/* DETALLES EXPANDIDOS */}
      {open && (
        <div className="mt-3 p-3 rounded-lg bg-[#fefbf8] border"
          style={{ borderColor: "rgba(92,46,11,0.15)" }}
        >
          {isJuris && (
            <>
              {item.especialidad && (
                <p className="text-[12px] mb-1 text-[#5C2E0B] opacity-80">
                  Especialidad: {item.especialidad}
                </p>
              )}

              {item.sumilla && (
                <p className="text-[13px] text-[#5C2E0B] leading-snug whitespace-pre-line">
                  <strong>Sumilla:</strong> {item.sumilla}
                </p>
              )}
            </>
          )}

          {isPDF && (
            <p className="text-[13px] text-[#5C2E0B] opacity-80">
              Documento PDF procesado. Tokens: {item.tokens || "—"}
            </p>
          )}

          {/* FUTURO: notas doctrinales, ratio decisoria, etc */}
        </div>
      )}
    </div>
  );
}
