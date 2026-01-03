// ============================================================
// 🧰 LitisToolsModal.jsx – Panel flotante tipo ChatGPT
// ------------------------------------------------------------
// • Se abre sobre el cajón del chat (bottom en móvil, centro en desktop)
// • Incluye:
//    - Acciones de conversación (nuevo chat, pantalla completa)
//    - Plantillas reales con previsualización + autocompletado
//    - Estrategia del caso (matriz simple de categorías)
//    - Embeddings de documentos (estado básico, listo para backend)
//    - Historial inteligente por caso (placeholder PRO)
// ============================================================

import React from "react";
import {
  FaLock,
  FaFilePdf,
  FaBalanceScale,
  FaKeyboard,
  FaHistory,
  FaRegLightbulb,
  FaMagic,
  FaListUl,
} from "react-icons/fa";

export default function LitisToolsModal({
  open,
  onClose,
  pro,

  // Conversación
  onNewChat,
  onOpenFull,

  // Plantillas
  templates = [],
  onTemplateInsert,

  // Estrategia
  onStrategySelect,

  // Embeddings
  embeddingsInfo,        // { total, indexados, ultActualizacion }
  onShowEmbeddingsPanel, // por ahora placeholder

  // Historial
  onShowHistoryInsight,  // acción rápida tipo "resume este chat"
}) {
  if (!open) return null;

  const handleOverlayClick = () => onClose && onClose();

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/30 flex items-end md:items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          bg-white rounded-2xl shadow-xl w-full md:w-[540px]
          p-5 mb-3 md:mb-0
          max-h-[90vh] overflow-y-auto
          animate-[fadeInUp_.22s_ease-out]
        "
      >
        {/* HEADER */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#3A2A1A]">
              Herramientas IA de escritorio
            </h2>
            <p className="text-xs text-[#8C8C96]">
              Actúa sobre el chat actual: plantillas, estrategia, PDFs y memoria.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded-full bg-[#F5F5F7] text-[#555]"
          >
            Cerrar
          </button>
        </div>

        {/* ================= CONVERSACIÓN ================= */}
        <section className="mb-4">
          <h3 className="text-[11px] font-bold text-[#8C8C96] mb-1 uppercase tracking-wide">
            Conversación
          </h3>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onNewChat}
              className="tool-item"
            >
              <span className="flex items-center gap-2">
                🆕
                <span className="font-medium">Nuevo chat</span>
              </span>
              <span className="text-[11px] text-[#8C8C96]">
                Limpia el historial y comienza desde cero
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenFull}
              className="tool-item"
            >
              <span className="flex items-center gap-2">
                🖥️
                <span className="font-medium">Abrir en pantalla completa</span>
              </span>
              <span className="text-[11px] text-[#8C8C96]">
                Modo inmersivo para trabajar solo con LitisBot
              </span>
            </button>
          </div>
        </section>

        {/* ================= PLANTILLAS ================= */}
        <section className="mb-4">
          <h3 className="text-[11px] font-bold text-[#8C8C96] mb-1 uppercase tracking-wide">
            Plantillas jurídicas
          </h3>

          <div className="border border-[#F0F0F4] rounded-xl overflow-hidden">
            {templates.length === 0 && (
              <div className="px-3 py-3 text-xs text-[#8C8C96]">
                Aún no has configurado plantillas. Por ahora se usan las básicas
                por defecto en el Engine.
              </div>
            )}

            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="px-3 py-2 border-t border-[#F5F5F7] first:border-t-0 flex items-start justify-between gap-3 hover:bg-[#FFFBF5]"
              >
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#3A2A1A] flex items-center gap-2">
                    <FaKeyboard className="text-[12px] text-[#C37C32]" />
                    {tpl.nombre}
                    {tpl.pro && (
                      <span className="ml-1 text-[10px] px-1.5 py-[1px] rounded-full bg-[#FFF1CC] text-[#7A5500]">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8C8C96] line-clamp-2">
                    {tpl.descripcion}
                  </p>
                  <pre className="mt-1 text-[11px] bg-[#F9F5EE] text-[#5C2E0B] rounded-md px-2 py-1 whitespace-pre-wrap max-h-24 overflow-y-auto">
                    {tpl.preview}
                  </pre>
                </div>

                <button
                  type="button"
                  onClick={() => onTemplateInsert && onTemplateInsert(tpl)}
                  className="
                    text-[11px] px-2 py-1 mt-1 rounded-md
                    bg-[#5C2E0B] text-white hover:bg-[#48210A]
                    shrink-0 self-start
                  "
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ================= ESTRATEGIA DEL CASO ================= */}
        <section className="mb-4">
          <h3 className="text-[11px] font-bold text-[#8C8C96] mb-1 uppercase tracking-wide">
            Estrategia del caso
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => onStrategySelect && onStrategySelect("defensa")}
              className="strategy-pill"
            >
              <FaRegLightbulb className="text-[13px]" />
              Defensa del demandado
            </button>

            <button
              type="button"
              onClick={() => onStrategySelect && onStrategySelect("demanda")}
              className="strategy-pill"
            >
              <FaMagic className="text-[13px]" />
              Estrategia para demanda
            </button>

            <button
              type="button"
              onClick={() => onStrategySelect && onStrategySelect("audiencia")}
              className="strategy-pill"
            >
              🎙️ Plan de audiencia
            </button>

            <button
              type="button"
              onClick={() => onStrategySelect && onStrategySelect("pruebas")}
              className="strategy-pill"
            >
              <FaListUl className="text-[13px]" />
              Matriz de medios probatorios
            </button>
          </div>

          <p className="mt-1 text-[11px] text-[#8C8C96]">
            Al elegir una categoría, LitisBot prepara un prompt avanzado en el
            cajón del chat para que puedas completarlo con los datos de tu caso.
          </p>
        </section>

        {/* ================= EMBEDDINGS DE DOCUMENTOS ================= */}
        <section className="mb-4">
          <h3 className="text-[11px] font-bold text-[#8C8C96] mb-1 uppercase tracking-wide">
            Embeddings de documentos
          </h3>

          <div className="tool-item !items-start">
            <div className="flex items-start gap-2">
              <FaFilePdf className="mt-[2px] text-[#C37C32]" />
              <div>
                <div className="text-[13px] font-medium text-[#3A2A1A]">
                  Estado de indexación
                </div>
                <div className="text-[11px] text-[#8C8C96]">
                  Total: {embeddingsInfo?.total ?? 0} • Indexados:{" "}
                  {embeddingsInfo?.indexados ?? 0}
                  {embeddingsInfo?.ultActualizacion && (
                    <>
                      {" "}
                      • Última actualización:{" "}
                      {embeddingsInfo.ultActualizacion}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onShowEmbeddingsPanel}
              className="text-[11px] px-2 py-1 rounded-md bg-[#F5F3FF] text-[#5C2E0B] hover:bg-[#E7E0FF]"
            >
              Ver detalle
            </button>
          </div>
        </section>

        {/* ================= HISTORIAL INTELIGENTE ================= */}
        <section className="mb-2">
          <h3 className="text-[11px] font-bold text-[#8C8C96] mb-1 uppercase tracking-wide">
            Historial inteligente
          </h3>

          <button
            type="button"
            onClick={onShowHistoryInsight}
            className="tool-item"
          >
            <span className="flex items-center gap-2">
              <FaHistory className="text-[13px]" />
              <span className="font-medium">Resumen jurídico del chat</span>
            </span>
            <span className="text-[11px] text-[#8C8C96]">
              Inserta en el cajón un prompt para que LitisBot resuma este caso,
              identifique riesgos y próximos pasos.
            </span>
          </button>
        </section>

        {/* FOOTER PRO */}
        {!pro && (
          <div className="mt-3 text-[11px] text-[#8C8C96] border-t border-[#F0F0F4] pt-2">
            Algunas herramientas avanzadas requieren{" "}
            <span className="font-semibold text-[#C37C32]">Plan PRO</span>. En
            esta versión se muestran en modo demostración.
          </div>
        )}
      </div>
    </div>
  );
}
