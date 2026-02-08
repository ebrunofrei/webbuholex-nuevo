// ============================================================================
// 🦉 LitisBotEngine — ENGINE PURO (CANÓNICO + SNAPSHOT COGNITIVO)
// ----------------------------------------------------------------------------
// - NO maneja UI
// - NO persiste estado
// - NO interpreta herramientas
// - SOLO:
//   • arma contexto conversacional
//   • envía prompt al core
//   • inyecta snapshot cognitivo (si existe)
// ============================================================================

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";

import {
  enviarPromptLitis,
  normalizeAssistantMessage,
} from "@/services/litisEngineCore.js";

import { useLitisCognitiveSafe } from
  "@/components/litisbot/context/LitisBotCognitiveContext.jsx";

// ---------------------------------------------------------------------------
// 🧠 Contexto conversacional (historia corta, estable)
// ---------------------------------------------------------------------------
const MAX_HISTORY = 12;

function buildConversationContext(messages = []) {
  return messages
    .filter((m) => !m?._placeholder)
    .slice(-MAX_HISTORY)
    .map((m) =>
      m.role === "user"
        ? `Usuario: ${m.content}`
        : `LitisBot: ${m.content}`
    )
    .join("\n");
}

// ============================================================================
// COMPONENTE
// ============================================================================
const LitisBotEngine = forwardRef(function LitisBotEngine(
  {
    usuarioId,
    chatIdActivo, // Este es el chatSessionId del Pro
    mensajes = [],
    jurisSeleccionada,
    pro = false,
  },
  ref
) {
  const sendingRef = useRef(false);
  const cognitive = useLitisCognitiveSafe();

  const enviarMensaje = useCallback(
    async (texto, adjuntos = [], extra = {}) => {
      if (sendingRef.current) return { ok: false };
      sendingRef.current = true;

      try {
        const historyText = buildConversationContext(mensajes);

        const finalPrompt = historyText
          ? `CONTEXTO PREVIO:\n${historyText}\n\nINSTRUCCIÓN:\n${texto}`
          : texto;

        const cognitiveSnapshot = cognitive?.getSnapshot?.() || null;

        // ✅ GARANTÍA DE SESIÓN: 
        // Si no viene en extra, usamos el chatIdActivo. 
        // Si no hay ninguno, el backend rebotará por seguridad.
        const activeSession = extra?.sessionId || chatIdActivo;

        const raw = await enviarPromptLitis({
          prompt: finalPrompt,
          usuarioId,
          sessionId: activeSession, // 🧠 Alineado con req.body.sessionId del Backend
          
          // Metadatos adicionales
          expedienteId: chatIdActivo || null, 
          adjuntos,
          contexto: jurisSeleccionada?.length
            ? { tipo: "juris", partes: jurisSeleccionada }
            : null,
          pro,
          cognitive: cognitiveSnapshot,
        });

        const assistantMessage = normalizeAssistantMessage(raw);

        return {
          ok: true,
          assistantMessage,
          intent: assistantMessage.meta?.intent || null,
          payload: assistantMessage.meta?.payload || null,
        };
      } catch (err) {
        console.error("❌ Engine error:", err);
        return { ok: false, error: "engine_failure" };
      } finally {
        sendingRef.current = false;
      }
    },
    [usuarioId, chatIdActivo, mensajes, jurisSeleccionada, pro, cognitive]
  );

  useImperativeHandle(ref, () => ({
    enviarMensaje,
  }));

  return null;
});

export default LitisBotEngine;
