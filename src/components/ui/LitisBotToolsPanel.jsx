// src/components/ui/LitisBotToolsPanel.jsx
import React from "react";
import {
  FaCog,
  FaComments,
  FaGavel,
  FaFileAlt,
  FaHistory,
  FaExternalLinkAlt,
} from "react-icons/fa";

export default function LitisBotToolsPanel({
  open,
  onClose,
  isPro,
  usuarioId,
  hasJuris,
  onNuevoChat,
  onToggleTtsCfg,
  onOpenFull,
  onClickAnalisisJuris,   // en el futuro
  onClickRedaccionDoc,    // en el futuro
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-end bg-black/30"
      aria-modal="true"
      role="dialog"
      aria-label="Panel de herramientas de LitisBot"
      onClick={onClose}
    >
      {/* Drawer derecho */}
      <div
        className="w-full max-w-xs h-full bg-white shadow-xl border-l flex flex-col"
        style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del panel */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "rgba(92,46,11,0.15)", background: "#fdf4ec" }}
        >
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[15px]">LitisBot Panel</span>
            <span className="text-[11px] opacity-80">
              {usuarioId ? `Sesión: ${usuarioId}` : "Invitado • Acceso básico"}
            </span>
          </div>
          <button
            className="text-[20px] font-bold px-1"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-[14px]">

          {/* Conversaciones */}
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-2 opacity-80">
              Conversaciones
            </h3>
            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border mb-2 active:scale-95"
              style={{ borderColor: "rgba(92,46,11,0.25)" }}
              onClick={() => {
                onNuevoChat && onNuevoChat();
                onClose();
              }}
            >
              <span className="flex items-center gap-2">
                <FaComments /> <span>Nuevo chat</span>
              </span>
            </button>

            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border active:scale-95"
              style={{ borderColor: "rgba(92,46,11,0.25)" }}
              onClick={() => {
                onOpenFull && onOpenFull();
              }}
            >
              <span className="flex items-center gap-2">
                <FaExternalLinkAlt /> <span>Abrir en pantalla completa</span>
              </span>
            </button>
          </section>

          {/* Herramientas Pro */}
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-2 opacity-80">
              Herramientas Pro
            </h3>

            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border mb-2 active:scale-95"
              style={{
                borderColor: "rgba(92,46,11,0.25)",
                opacity: isPro ? 1 : 0.7,
              }}
              onClick={() => {
                if (!isPro) {
                  // por ahora solo informamos; lógica Pro después
                  alert(
                    "Análisis de jurisprudencia está disponible en LitisBot Pro. Te mostraremos un ejemplo gratis en la siguiente versión."
                  );
                  return;
                }
                onClickAnalisisJuris && onClickAnalisisJuris();
                onClose();
              }}
            >
              <span className="flex items-center gap-2">
                <FaGavel /> <span>Análisis de jurisprudencia</span>
              </span>
              {!isPro && <span className="text-[11px] font-semibold">🔒</span>}
            </button>

            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border mb-2 active:scale-95"
              style={{
                borderColor: "rgba(92,46,11,0.25)",
                opacity: isPro ? 1 : 0.7,
              }}
              onClick={() => {
                if (!isPro) {
                  alert(
                    "Redacción de documentos está disponible en LitisBot Pro."
                  );
                  return;
                }
                onClickRedaccionDoc && onClickRedaccionDoc();
                onClose();
              }}
            >
              <span className="flex items-center gap-2">
                <FaFileAlt /> <span>Redacción de documentos</span>
              </span>
              {!isPro && <span className="text-[11px] font-semibold">🔒</span>}
            </button>

            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border active:scale-95"
              style={{
                borderColor: "rgba(92,46,11,0.25)",
                opacity: isPro ? 1 : 0.7,
              }}
              onClick={() => {
                alert("Historial completo de chats llegará con LitisBot Pro.");
              }}
            >
              <span className="flex items-center gap-2">
                <FaHistory /> <span>Historial de chats</span>
              </span>
              {!isPro && <span className="text-[11px] font-semibold">🔒</span>}
            </button>
          </section>

          {/* Configuración */}
          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-2 opacity-80">
              Configuración
            </h3>

            <button
              className="w-full flex items-center justify-between px-3 py-2 rounded-md border active:scale-95"
              style={{ borderColor: "rgba(92,46,11,0.25)" }}
              onClick={() => {
                onToggleTtsCfg && onToggleTtsCfg();
                onClose();
              }}
            >
              <span className="flex items-center gap-2">
                <FaCog /> <span>Configuración de voz</span>
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
