// litisbot/chat-pro/hooks/useChatSend.js
// ============================================================================
// 💬 useChatSend — Enterprise Pipeline (ChatGPT-style)
// ----------------------------------------------------------------------------
// - Inserta mensaje usuario
// - Inserta placeholder determinista
// - Ejecuta transport (Engine o backend)
// - Reemplaza SOLO su placeholder
// - Devuelve contrato limpio { ok, intent, payload }
// - Blindado contra respuestas inconsistentes
// ============================================================================

import { useState, useRef, useCallback } from "react";

export default function useChatSend({
  setMessages,
  transport, // async ({ text, adjuntos, sessionId }) => { ok, assistantMessage, intent, payload }
}) {
  const [sending, setSending] = useState(false);

  // Previene envíos concurrentes
  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async ({ text, adjuntos = [], sessionId }) => {
      const trimmed = (text || "").trim();

      if (!trimmed && adjuntos.length === 0) return null;

      if (sendingRef.current) {
        console.warn("⏳ Envío bloqueado: ya hay uno en curso");
        return null;
      }

      sendingRef.current = true;
      setSending(true);

      const now = Date.now();

      // -------------------------------------------------------
      // 1️⃣ USER MESSAGE
      // -------------------------------------------------------
      const userMessage = {
        id: `u-${now}`,
        role: "user",
        content: trimmed || "Adjunto documentos.",
        createdAt: new Date().toISOString(),
      };

      const placeholderId = `p-${crypto.randomUUID()}`;

      const placeholder = {
        id: placeholderId,
        role: "assistant",
        _placeholder: true,
        content: "Analizando...",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, placeholder]);

      // -------------------------------------------------------
      // 2️⃣ TRANSPORT
      // -------------------------------------------------------
      let response;

      try {
        response = await transport({
          text: trimmed,
          adjuntos,
          sessionId,
        });
      } catch (err) {
        console.error("❌ Transport error:", err);

        replacePlaceholderWithError(
          setMessages,
          placeholderId,
          "Error procesando la solicitud."
        );

        sendingRef.current = false;
        setSending(false);
        return null;
      }

      if (!response) {
        // Engine decidió ignorar
        removePlaceholder(setMessages, placeholderId);

        sendingRef.current = false;
        setSending(false);
        return null;
      }

      // -------------------------------------------------------
      // 3️⃣ NORMALIZACIÓN SEGURA
      // -------------------------------------------------------
      const normalized = normalizeResponse(response);

      if (!normalized.ok) {
        replacePlaceholderWithError(
          setMessages,
          placeholderId,
          normalized.error || "Error inesperado"
        );

        sendingRef.current = false;
        setSending(false);
        return normalized;
      }

      // -------------------------------------------------------
      // 4️⃣ REEMPLAZO DURO DEL PLACEHOLDER
      // -------------------------------------------------------
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? {
                ...normalized.assistantMessage,
                id: placeholderId, // mantiene orden visual
                _placeholder: false,
                createdAt: new Date().toISOString(),
              }
            : m
        )
      );

      sendingRef.current = false;
      setSending(false);

      return {
      ...normalized,
      assistantContent: normalized.assistantMessage?.content || "",
    };
    },
    [transport, setMessages]
  );

  return { sendMessage, sending };
}

// ============================================================================
// 🔒 Helpers internos — Blindaje enterprise
// ============================================================================

function normalizeResponse(res) {
  if (!res) {
    return {
      ok: false,
      error: "empty_response",
    };
  }

  // Si ya viene bien formado
  if (res.assistantMessage && typeof res.assistantMessage === "object") {
    return {
      ok: res.ok !== false,
      assistantMessage: ensureAssistantShape(res.assistantMessage),
      intent: res.intent || null,
      payload: res.payload || null,
      error: res.error || null,
    };
  }

  // Backend tipo { respuesta: "texto" }
  if (res.respuesta) {
    return {
      ok: res.ok !== false,
      assistantMessage: {
        role: "assistant",
        content: String(res.respuesta),
      },
      intent: res.intent || null,
      payload: res.payload || null,
    };
  }

  // Backend tipo string
  if (typeof res === "string") {
    return {
      ok: true,
      assistantMessage: {
        role: "assistant",
        content: res,
      },
    };
  }

  return {
    ok: false,
    error: "invalid_response_shape",
  };
}

function ensureAssistantShape(message) {
  if (!message.role) message.role = "assistant";
  if (!message.content) message.content = "";
  return message;
}

function replacePlaceholderWithError(setMessages, placeholderId, errorText) {
  setMessages((prev) =>
    prev.map((m) =>
      m.id === placeholderId
        ? {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: errorText,
            createdAt: new Date().toISOString(),
          }
        : m
    )
  );
}

function removePlaceholder(setMessages, placeholderId) {
  setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
}