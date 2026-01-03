import React from "react";
import {
  FaFilePdf,
  FaBalanceScale,
  FaPenNib,
  FaBook,
  FaCogs,
  FaLock,
  FaTimes,
} from "react-icons/fa";

function ToolButton({ disabled, onClick, icon, label, pro, proOnly }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="
        w-full flex items-center gap-3 p-3 rounded-lg
        border text-[14px]
        transition
        disabled:opacity-50 disabled:cursor-not-allowed
        bg-[#FFF7F0] hover:bg-[#FFEAD6]
      "
    >
      <span className="text-[#A74B1A]">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {proOnly && !pro && <FaLock className="text-[#A74B1A]" />}
    </button>
  );
}

export default function LitisToolsPanel({
  open,
  onClose,
  pro,

  // callbacks “enterprise”
  onSelectTool, // (toolKey) => void
  onHistorial,
  onConfigVoz,
}) {
  const select = (toolKey) => {
    onSelectTool?.(toolKey);
    onClose?.();
  };

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[998] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed md:static top-0 right-0 h-full
          w-[86%] max-w-[340px]
          bg-white border-l border-[#E2E2E8]
          shadow-xl md:shadow-none
          z-[999]
          transform transition-transform duration-300
          flex flex-col
          ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <h2 className="text-[16px] font-semibold text-[#3A2A1A]">
            Herramientas IA
          </h2>

          <button
            className="md:hidden text-[#5C2E0B] w-9 h-9 rounded-lg hover:bg-[#F7F7FA] flex items-center justify-center"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            type="button"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8">
          {/* Conversaciones */}
          <div>
            <h3 className="text-[13px] text-[#8C8C96] font-semibold mb-2">
              Conversaciones
            </h3>

            <button
              onClick={() => {
                onHistorial?.();
                onClose?.();
              }}
              className="
                w-full flex items-center gap-3 p-3
                bg-[#F7F7FA] hover:bg-[#EFEFF4]
                rounded-lg text-[14px]
              "
            >
              <FaBook className="text-[#5C2E0B]" />
              Historial de chats
            </button>
          </div>

          {/* Herramientas PRO */}
          <div>
            <h3 className="text-[13px] text-[#8C8C96] font-semibold mb-2">
              Herramientas PRO
            </h3>

            <div className="space-y-2">
              <ToolButton
                pro={pro}
                proOnly
                disabled={!pro}
                onClick={() => select("pdf")}
                icon={<FaFilePdf />}
                label="Análisis de PDF"
              />

              <ToolButton
                pro={pro}
                proOnly
                disabled={!pro}
                onClick={() => select("juris")}
                icon={<FaBalanceScale />}
                label="Análisis jurisprudencial"
              />

              <ToolButton
                pro={pro}
                proOnly
                disabled={!pro}
                onClick={() => select("draft")}
                icon={<FaPenNib />}
                label="Redacción asistida"
              />

              <ToolButton
                pro={pro}
                proOnly
                disabled={!pro}
                onClick={() => select("estrategia")}
                icon={<FaPenNib className="rotate-45" />}
                label="Estrategia del caso"
              />
            </div>

            {!pro && (
              <div className="mt-3 text-[12px] text-[#8C8C96] leading-relaxed">
                Estas herramientas están bloqueadas. Activa PRO para usarlas sin límites.
              </div>
            )}
          </div>

          {/* Configuración */}
          <div>
            <h3 className="text-[13px] text-[#8C8C96] font-semibold mb-2">
              Configuración
            </h3>

            <button
              onClick={() => {
                onConfigVoz?.();
                onClose?.();
              }}
              className="
                w-full flex items-center gap-3 p-3 rounded-lg
                bg-[#F7F7FA] hover:bg-[#EFEFF4]
                text-[14px]
              "
            >
              <FaCogs className="text-[#5C2E0B]" />
              Configuración de voz (TTS)
            </button>
          </div>

          {/* Próximamente */}
          <div className="border-t pt-4">
            <h3 className="text-[13px] text-[#8C8C96] font-semibold mb-3">
              Próximamente
            </h3>

            <div className="text-[13px] text-[#6B6B76] leading-relaxed space-y-1">
              <div>- Análisis predictivo de sentencias</div>
              <div>- Cuadro comparativo entre jurisprudencias</div>
              <div>- Redacción automática de demandas completas</div>
              <div>- Gestión integral de expedientes (v.2)</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
