// ============================================================================
// 🧠 AnalysisWindow — Enterprise Legal Workspace (Canónico)
// ----------------------------------------------------------------------------
// ✔ Layout puro (scroll, contenedor, densidad)
// ✔ Delegación SOLO assistant a MensajeBotBubble (análisis/pesos viven ahí)
// ✔ Usuario se pinta INLINE (sin burbuja) para respetar el input
// ✔ StructuredAnalysis: por mensaje (preferido) + fallback global en último assistant
// ============================================================================

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import ConfirmActionModal from "@/components/litisbot/modals/ConfirmActionModal.jsx";

import MensajeBotBubble from "@/components/ui/MensajeBotBubble.jsx";

const STYLES = {
  container: "flex-1 min-h-0 flex flex-col bg-neutral-50 relative",
  scrollArea: "flex-1 overflow-y-auto",
  contentWrapper: "w-full max-w-3xl mx-auto px-6 py-14 space-y-14",
  thinking: "text-neutral-400 text-sm animate-pulse",
  scrollButton:
    "fixed bottom-24 right-8 bg-white border border-neutral-200 rounded-full p-2 shadow-sm hover:bg-neutral-100 transition",
  // Usuario (editorial, sin burbuja)
  userBlock: "flex",
  userText: "ml-auto max-w-[70%] text-[15px] leading-7 text-neutral-500",
};

export default function AnalysisWindow({
  messages = [],
  activeCaseId,
  activeChatId,
  structuredAnalysis = null, // fallback global
  onCognitiveAction,
}) {
  const feedRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState(null);

  // ---------------------------------------------------------------------------
  // 📌 Índice del último mensaje assistant (para fallback de structuredAnalysis)
  // ---------------------------------------------------------------------------
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "assistant" && !messages[i]?._placeholder) {
        return i;
      }
    }
    return -1;
  }, [messages]);

  // ---------------------------------------------------------------------------
  // 📜 Scroll inteligente
  // ---------------------------------------------------------------------------
  const scrollToBottom = useCallback((behavior = "smooth") => {
    const node = feedRef.current;
    if (!node) return;

    node.scrollTo({
      top: node.scrollHeight,
      behavior,
    });
  }, []);

  const handleScroll = useCallback(() => {
    const node = feedRef.current;
    if (!node) return;

    const threshold = 140;
    const atBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < threshold;

    setIsNearBottom(atBottom);
  }, []);

  useEffect(() => {
    if (isNearBottom) scrollToBottom();
  }, [messages, isNearBottom, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // 🧠 Confirmación cognitiva
  // ---------------------------------------------------------------------------
  const handleConfirm = useCallback(() => {
    if (!pendingConfirm) return;

    onCognitiveAction?.({
      type: "CONFIRMED_ACTION",
      payload: {
        ...pendingConfirm,
        context: {
          caseId: activeCaseId,
          chatId: activeChatId,
        },
      },
    });

    setPendingConfirm(null);
  }, [pendingConfirm, onCognitiveAction, activeCaseId, activeChatId]);

  // ---------------------------------------------------------------------------
  // 🏛 Render
  // ---------------------------------------------------------------------------
  return (
    <section className={STYLES.container}>
      <div ref={feedRef} onScroll={handleScroll} className={STYLES.scrollArea}>
        <div className={STYLES.contentWrapper}>
          {messages.map((m, i) => {
            const key = m.id || i;

            // -----------------------------
            // Placeholder / Thinking
            // -----------------------------
            if (m._placeholder) {
              return (
                <div key={key} className={STYLES.thinking}>
                  Procesando análisis jurídico…
                </div>
              );
            }

            // -----------------------------
            // Assistant -> delegación (aquí viven los "pesos"/panel)
            // -----------------------------
            if (m.role === "assistant") {
              // 1) Preferir análisis por mensaje
              // 2) Fallback global solo para el último assistant
              const analysisForThisMessage =
                m.structuredAnalysis ||
                (structuredAnalysis && i === lastAssistantIndex
                  ? structuredAnalysis
                  : null);

              return (
                <MensajeBotBubble
                  key={key}
                  msg={m}
                  activeChatId={activeChatId}
                  structuredAnalysis={analysisForThisMessage}
                />
              );
            }

            // -----------------------------
            // Usuario -> INLINE (sin burbuja)
            // -----------------------------
            return (
              <div key={key} className={STYLES.userBlock}>
                <div className={STYLES.userText}>{m.content}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll Button */}
      {!isNearBottom && (
        <button
          onClick={() => scrollToBottom()}
          className={STYLES.scrollButton}
          aria-label="Bajar al final"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* Confirmación Cognitiva */}
      <ConfirmActionModal
        open={!!pendingConfirm}
        confirmation={pendingConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </section>
  );
}