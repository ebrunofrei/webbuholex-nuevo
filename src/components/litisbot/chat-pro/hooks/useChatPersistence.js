// litisbot/chat-pro/hooks/useChatPersistence.js

import { useEffect, useRef, useState } from "react";
import {
  getChatStorageKey,
  safeJsonParse,
  stripPlaceholders,
} from "../services/chatStorage";

export default function useChatPersistence({
  usuarioId,
  contextId,
  sessionId,
  messages,
  setMessages,
}) {
  const [hydrated, setHydrated] = useState(false);
  const lastHydratedSessionRef = useRef(null);

  // Rehidratación
  useEffect(() => {
    if (!usuarioId || !contextId || !sessionId) return;

    if (lastHydratedSessionRef.current === sessionId) return;

    const key = getChatStorageKey({
      usuarioId,
      contextId,
      sessionId,
    });

    if (!key) return;

    const raw = localStorage.getItem(key);
    const parsed = safeJsonParse(raw, []);

    setMessages(parsed);

    lastHydratedSessionRef.current = sessionId;
    setHydrated(true);
  }, [usuarioId, contextId, sessionId, setMessages]);

  // Autoguardado limpio
  useEffect(() => {
    if (!usuarioId || !contextId || !sessionId) return;
    if (!hydrated) return;

    const key = getChatStorageKey({
      usuarioId,
      contextId,
      sessionId,
    });

    if (!key) return;

    try {
      localStorage.setItem(
        key,
        JSON.stringify(stripPlaceholders(messages))
      );
    } catch {}
  }, [messages, hydrated, usuarioId, contextId, sessionId]);

  return { hydrated };
}