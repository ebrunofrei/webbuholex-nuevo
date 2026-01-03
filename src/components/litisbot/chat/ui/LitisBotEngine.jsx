// ============================================================================
// 🦉 LitisBotEngine — ENGINE PURO (SIN TOCAR HISTORIAL)
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

const LitisBotEngine = forwardRef(function LitisBotEngine(
  {
    usuarioId,
    chatIdActivo,
    mensajes = [],
    jurisSeleccionada,
    pro = false,
  },
  ref
) {
  const sendingRef = useRef(false);

  const enviarMensaje = useCallback(
    async (texto, adjuntos = []) => {
      if (sendingRef.current) return { ok: false };
      sendingRef.current = true;

      try {
        const historyText = buildConversationContext(mensajes);

        const finalPrompt = historyText
          ? `CONTEXTO PREVIO:\n${historyText}\n\nINSTRUCCIÓN:\n${texto}`
          : texto;

        const raw = await enviarPromptLitis({
          prompt: finalPrompt,
          usuarioId,
          expedienteId: chatIdActivo,
          adjuntos,
          contexto: jurisSeleccionada?.length
            ? { tipo: "juris", partes: jurisSeleccionada }
            : null,
          pro,
          modoLitis: "litigante",
        });

        return {
          ok: true,
          assistantMessage: normalizeAssistantMessage(raw),
        };
      } catch (err) {
        console.error("❌ Engine error:", err);
        return {
          ok: false,
          error: "Error procesando la consulta.",
        };
      } finally {
        sendingRef.current = false;
      }
    },
    [usuarioId, chatIdActivo, mensajes, jurisSeleccionada, pro]
  );

  useImperativeHandle(ref, () => ({ enviarMensaje }));

  return null;
});

export default LitisBotEngine;
