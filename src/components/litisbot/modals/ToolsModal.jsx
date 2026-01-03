import React, { useEffect } from "react";
import { TOOL_REGISTRY, getToolByKey } from "@/components/litisbot/tools/ToolRegistry";

/**
 * ============================================================
 * 🧰 ToolsModal – LitisBot
 * ------------------------------------------------------------
 * Modal neutro para renderizar herramientas jurídicas
 * desde el ToolRegistry.
 *
 * Reglas:
 * - NO conoce el chat
 * - NO conoce el layout
 * - SOLO renderiza herramientas
 *
 * El contenedor decide:
 * - cuándo abrirlo
 * - qué toolKey usar
 * - si el usuario es PRO
 * ============================================================
 */

export default function ToolsModal({
  open = false,
  toolKey = null,
  onClose,
  pro = false,
}) {
  if (!open) return null;

  const tool = toolKey ? getToolByKey(toolKey) : null;
  const ToolComponent = tool?.component || null;

  // ==========================
  // Cerrar con ESC
  // ==========================
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3"
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="
          w-full max-w-md sm:max-w-lg
          bg-white rounded-2xl shadow-xl
          border border-[#E8C9A5]
          p-5 sm:p-6
          relative
        "
        role="dialog"
        aria-modal="true"
      >
        {/* ================== HEADER ================== */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-[#5C2E0B]">
            {tool ? tool.label : "Herramientas jurídicas"}
          </h2>

          <button
            onClick={onClose}
            className="
              text-[#5C2E0B] text-2xl font-bold
              hover:opacity-70 transition
            "
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* ================== CONTENIDO ================== */}
        {!toolKey && (
          <div className="flex flex-col gap-2">
            {Object.values(TOOL_REGISTRY).map((t) => {
              const disabled = t.pro && !pro;
              return (
                <button
                  key={t.key}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      // El contenedor controla toolKey
                      // Aquí solo informamos por evento DOM
                      window.dispatchEvent(
                        new CustomEvent("litisbot:select-tool", {
                          detail: t.key,
                        })
                      );
                    }
                  }}
                  className={`
                    text-left px-4 py-3 rounded-xl border
                    transition
                    ${
                      disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#FFF7EF] border-[#E8C9A5] text-[#5C2E0B] hover:bg-[#FBE8D6]"
                    }
                  `}
                  title={t.description}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {t.label}
                    {t.pro && (
                      <span className="text-[10px] bg-yellow-200 px-2 py-0.5 rounded">
                        PRO
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-80">
                    {t.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ================== TOOL ================== */}
        {toolKey && ToolComponent && (
          <div className="mt-2">
            {tool.pro && !pro ? (
              <div className="text-red-700 text-sm">
                Esta herramienta es exclusiva para usuarios PRO.
              </div>
            ) : (
              <ToolComponent />
            )}
          </div>
        )}

        {/* ================== FOOTER ================== */}
        {toolKey && (
          <div className="mt-4 flex justify-start">
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("litisbot:select-tool", {
                    detail: null,
                  })
                );
              }}
              className="text-sm text-[#5C2E0B] underline hover:opacity-80"
            >
              ← Volver a herramientas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
