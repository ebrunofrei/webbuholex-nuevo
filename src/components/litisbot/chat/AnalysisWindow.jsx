// ============================================================================
// 🧠 AnalysisWindow — Análisis jurídico dialogado (CANÓNICO)
// ----------------------------------------------------------------------------
// Rol:
// - Orquestador UX del ANÁLISIS
// - Combina razonamiento + diálogo
// - Captura acciones cognitivas
// - Gestiona confirmación explícita
// - Emite eventos (NO ejecuta, NO muta)

import React, { useEffect, useRef, useState, useCallback } from "react";

import ConfirmActionModal from "@/components/litisbot/modals/ConfirmActionModal.jsx";

import MensajeBotBubble from "@/components/ui/MensajeBotBubble.jsx";
import MensajeUsuarioBubble from "@/components/ui/MensajeUsuarioBubble.jsx";

import BotThinkingState from "@/components/litisbot/chat/ui/BotThinkingState.jsx";
import CognitiveSignal from "@/components/litisbot/chat/ui/CognitiveSignal.jsx";
import ActionHints from "@/components/litisbot/chat/ui/ActionHints.jsx";

export default function AnalysisWindow({
  messages = [],
  loading = false,
  activeCaseId,
  activeChatId,

  // 🔑 El padre decide: ejecutar, rehidratar, exportar, etc.
  onCognitiveAction,
}) {

  const feedRef = useRef(null);

  // ============================================================
  // UX-6.1 — Acción pendiente de confirmación
  // ============================================================
  const [pendingConfirm, setPendingConfirm] = useState(null);

  // ============================================================
  // Auto-scroll estable
  // ============================================================
  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;

    requestAnimationFrame(() => {
      try {
        node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      } catch {
        node.scrollTop = node.scrollHeight;
      }
    });
  }, [messages]);

  // ============================================================
  // Captura de acción cognitiva (NO ejecuta)
  // ============================================================
  const handleCognitiveAction = useCallback(
  (action) => {
    if (!action?.type) return;

    // ============================================
    // C.3.4 — ROLLBACK / REVERTIR A EVENTO
    // ============================================
    if (action.type === "ROLLBACK_EVENT") {
      setPendingConfirm({
        type: "ROLLBACK_EVENT",
        title: "Revertir a un punto anterior",
        description:
          "Esta acción revertirá el estado del caso a un momento anterior. La historia posterior quedará invalidada.",
        payload: {
          eventId: action.payload?.eventId,
        },
      });
      return;
    }

    // ============================================
    // C.2.2 — Rehidratación directa (sin confirm)
    // ============================================
    if (action.type === "LOAD_DRAFT") {
      onCognitiveAction?.(action);
      return;
    }

    // ============================================
    // UX-6.1 — Cualquier otra acción
    // ============================================
    setPendingConfirm({
      type: action.type,
      title: action.title || "Confirmar acción",
      description:
        action.description ||
        "Esta acción tendrá impacto en el sistema. ¿Deseas confirmarla?",
      payload: action.payload || {},
    });
  },
  [onCognitiveAction]
);

    // ============================================================
    // UX-6.2 — Confirmación explícita (NO ejecuta, solo emite)
    // ============================================================
    const handleConfirm = async () => {
      if (!pendingConfirm) return;

      // 1) Arma un “evento confirmado” estandarizado
      const confirmedAction = {
        type: pendingConfirm.type,
        payload: pendingConfirm.payload || {},
        confirmation: {
          confirmedByUser: true,
          confirmedAt: new Date().toISOString(),
        },
        context: {
          caseId: activeCaseId,
          chatId: activeChatId,
        },
      };

      // 2) Emite al padre (router/service decide qué hacer)
      onCognitiveAction?.({
        type: "CONFIRMED_ACTION",
        payload: confirmedAction,
      });

      // 3) Limpia UI
      setPendingConfirm(null);
    };

  return (
    <section className="flex-1 min-h-0 flex flex-col bg-white">
      {/* ================= FEED ================= */}
      <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto py-6">
        <div
          className="
            mx-auto
            w-full
            max-w-[860px] xl:max-w-[1040px]
            px-4 sm:px-6 xl:px-10
            space-y-10 md:space-y-12
            text-[17px] md:text-[18px]
            leading-relaxed
          "
        >
          {/* ================= ESTADO VACÍO ================= */}
          {!loading && messages.length === 0 && (
          <div className="mt-28 text-center max-w-[640px] mx-auto space-y-4">
            
            {/* Marca cognitiva */}
            <div className="text-[13px] tracking-widest uppercase text-black/40">
              Bienvenido a LitisBot
            </div>

            {/* Título */}
            <div className="text-[22px] md:text-[24px] font-semibold text-black">
              Análisis jurídico asistido
            </div>

            {/* Subtítulo */}
            <div className="text-[16px] leading-relaxed text-black/60">
              Estructuración de hechos, normas, criterios y escenarios jurídicos<br />
              bajo control, trazabilidad y auditoría.
            </div>

            {/* Separador sutil */}
            <div className="flex justify-center py-2">
              <div className="w-12 h-[2px] bg-[#6b3f2a]/40 rounded-full" />
            </div>

            {/* Guía */}
            <div className="text-[15px] text-black/50">
              Describe el caso, adjunta documentos o plantea una consulta jurídica.
            </div>

            {/* Micro-señal */}
            <div className="text-[13px] text-black/40">
            </div>

          </div>
        )}

          {/* ================= CARGANDO ================= */}
          {loading && (
            <div className="mt-20 text-center text-black/50 animate-pulse">
              Cargando análisis…
            </div>
          )}

          {/* ================= MENSAJES ================= */}
          {messages.map((m, i) => {
            const key = m.id || i;

            if (m._placeholder && m.thinkingState) {
              return <BotThinkingState key={key} state={m.thinkingState} />;
            }

            if (m.role === "assistant") {
              return (
                <div key={key} className="space-y-6 md:space-y-8">
                  
                  {/* Señal cognitiva — siempre arriba, discreta */}
                  {m.cognitive && (
                    <div className="pt-2">
                      <CognitiveSignal signal={m.cognitive} />
                    </div>
                  )}

                  {/* Acciones sugeridas — separadas del texto */}
                  {Array.isArray(m.actions) && m.actions.length > 0 && (
                    <div className="pt-1">
                      <ActionHints
                        actions={m.actions}
                        onAction={handleCognitiveAction}
                      />
                    </div>
                  )}

                  {/* Texto principal — documento */}
                  <div className="pt-2">
                    <MensajeBotBubble msg={m} />
                  </div>

                </div>
              );
            }

            return (
            <div key={key} className="flex justify-end pt-2">
              <MensajeUsuarioBubble
                texto={m.content}
                adjuntos={m.meta?.adjuntos || []}
              />
            </div>
          );
          })}
        </div>
      </div>

      {/* ================= CONFIRMACIÓN ================= */}
      <ConfirmActionModal
        open={!!pendingConfirm}
        confirmation={pendingConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </section>
  );
}
