// ============================================================================
// 🧠 AnalysisWindow — Análisis jurídico dialogado (CANÓNICO · SENIOR)
// ----------------------------------------------------------------------------
// Rol:
// - Orquestador UX del ANÁLISIS
// - Renderiza mensajes (usuario / asistente)
// - Controla scroll inteligente (tipo ChatGPT)
// - Gestiona confirmación cognitiva (NO agenda)
// - Emite eventos hacia el orquestador padre
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

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

  // 🔑 Callbacks externos
  onCognitiveAction,
  onAgendaAction,
}) {
  const feedRef = useRef(null);

  // ============================================================
  // Confirmación cognitiva (NUNCA agenda)
  // ============================================================
  const [pendingConfirm, setPendingConfirm] = useState(null);

  // ============================================================
  // Scroll inteligente (estilo ChatGPT)
  // ============================================================
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;

    const handleScroll = () => {
      const threshold = 120;
      const atBottom =
        node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
      setIsNearBottom(atBottom);
    };

    node.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => node.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const node = feedRef.current;
    if (!node || !isNearBottom) return;

    requestAnimationFrame(() => {
      try {
        node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
      } catch {
        node.scrollTop = node.scrollHeight;
      }
    });
  }, [messages, isNearBottom]);

  // ============================================================
  // Captura de acciones cognitivas (NO agenda)
  // ============================================================
  const handleCognitiveUIAction = useCallback(
    (action) => {
      if (!action?.type) return;

      // Blindaje total: agenda jamás entra aquí
      if (action.type.startsWith("AGENDA_")) return;

      if (action.type === "ROLLBACK_EVENT") {
        setPendingConfirm({
          type: "ROLLBACK_EVENT",
          title: "Revertir a un punto anterior",
          description:
            "Esta acción revertirá el estado del caso a un momento anterior. La historia posterior quedará invalidada.",
          payload: { eventId: action.payload?.eventId },
        });
        return;
      }

      if (action.type === "LOAD_DRAFT") {
        onCognitiveAction?.(action);
        return;
      }

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
  // Confirmación explícita
  // ============================================================
  const handleConfirm = () => {
    if (!pendingConfirm) return;

    onCognitiveAction?.({
      type: "CONFIRMED_ACTION",
      payload: {
        ...pendingConfirm,
        confirmation: {
          confirmedByUser: true,
          confirmedAt: new Date().toISOString(),
        },
        context: {
          caseId: activeCaseId,
          chatId: activeChatId,
        },
      },
    });

    setPendingConfirm(null);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <section className="flex-1 min-h-0 flex flex-col bg-white relative">
      <div ref={feedRef} className="flex-1 overflow-y-auto py-6">
        <div className="mx-auto max-w-[1040px] px-4 space-y-12">

          {messages.map((m, i) => {
            const key = m.id || i;

            if (m._placeholder) {
              return <BotThinkingState key={key} label="Analizando…" />;
            }

            if (m.role === "assistant") {
              return (
                <div key={key} className="space-y-8">
                  {m.cognitive && (
                    <CognitiveSignal signal={m.cognitive} />
                  )}

                  {Array.isArray(m.actions) && m.actions.length > 0 && (
                    <ActionHints
                      actions={m.actions}
                      onAction={handleCognitiveUIAction}
                    />
                  )}

                  <MensajeBotBubble
                    msg={m}
                    modoSalida="word"
                    onAgendaAction={onAgendaAction}
                  />
                </div>
              );
            }

            return (
              <MensajeUsuarioBubble
                key={key}
                texto={m.content}
                adjuntos={m.meta?.adjuntos || []}
              />
            );
          })}
        </div>
      </div>

      {/* Botón bajar al final */}
      {!isNearBottom && (
        <button
          className="litis-scroll-chatgpt"
          onClick={() => {
            const node = feedRef.current;
            if (!node) return;
            node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
          }}
          aria-label="Bajar al final"
        >
          <div className="litis-scroll-chatgpt-icon">
            <ChevronDown size={22} />
          </div>
        </button>
      )}

      {/* Confirmación cognitiva */}
      <ConfirmActionModal
        open={!!pendingConfirm}
        confirmation={pendingConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </section>
  );
}
