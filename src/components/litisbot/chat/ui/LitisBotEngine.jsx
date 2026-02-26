// chat/ui/LitisBotEngine.jsx
// ============================================================================
// 🦉 LitisBotEngine — ENGINE PURO (CANÓNICO + SNAPSHOT COGNITIVO)
// ----------------------------------------------------------------------------
// - NO maneja UI
// - NO persiste estado
// - NO interpreta herramientas
// - SOLO:
//   • arma contexto conversacional
//   • envía prompt al core
//   • normaliza respuesta a AssistantMessage CANÓNICO
//   • inyecta snapshot cognitivo (si existe)
// ============================================================================

import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

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
    .map((m) => (m.role === "user" ? `Usuario: ${m.content}` : `LitisBot: ${m.content}`))
    .join("\n");
}

const LitisBotEngine = forwardRef(function LitisBotEngine(
  { usuarioId, chatIdActivo, mensajes = [], jurisSeleccionada, pro = false },
  ref
) {
  const sendingRef = useRef(false);
  const cognitive = useLitisCognitiveSafe();

  const enviarMensaje = useCallback(
    async (texto, adjuntos = [], extra = {}) => {
      if (sendingRef.current) {
        console.warn("⏳ Mensaje ignorado: envío en curso");
        return null;
      }
      sendingRef.current = true;

      try {
        const historyText = buildConversationContext(mensajes);

        const finalPrompt = historyText
          ? `CONTEXTO PREVIO:\n${historyText}\n\nINSTRUCCIÓN:\n${texto}`
          : texto;

        const cognitiveSnapshot = cognitive?.getSnapshot?.() || null;

        // ✅ GARANTÍA DE SESIÓN:
        const activeSession = extra?.sessionId || chatIdActivo;

        console.log("SESSION DEBUG:", {
          extraSession: extra?.sessionId,
          chatIdActivo,
          finalSession: activeSession,
        });

        const raw = await enviarPromptLitis({
          prompt: finalPrompt,
          usuarioId,
          sessionId: activeSession,
          expedienteId: chatIdActivo || null,
          adjuntos,
          contexto: jurisSeleccionada?.length
            ? { tipo: "juris", partes: jurisSeleccionada }
            : null,
          pro,
          cognitive: cognitiveSnapshot,
        });

        // ✅ CANON: SIEMPRE devolver AssistantMessage normalizado (objeto)
        const assistantMessage = normalizeAssistantMessage(raw);

        return {
          ok: assistantMessage?.meta?.ok !== false,
          assistantMessage,
          intent: assistantMessage?.meta?.intent || null,
          payload: assistantMessage?.meta?.payload || null,
        };
      } catch (err) {
        console.error("❌ Engine error:", err);

        // ✅ Respuesta canónica incluso en error (para que el pipeline reemplace placeholder)
        const assistantMessage = normalizeAssistantMessage({
          ok: false,
          respuesta: "Error procesando la solicitud.",
          error: "engine_failure",
        });

        return { ok: false, assistantMessage, intent: null, payload: null, error: "engine_failure" };
      } finally {
        sendingRef.current = false;
      }
    },
    [usuarioId, chatIdActivo, mensajes, jurisSeleccionada, pro, cognitive]
  );

  useImperativeHandle(ref, () => ({ enviarMensaje }));

  return null;
});

export default LitisBotEngine;