// ============================================================================
// LITIS | useGeneralChat — R7.7+++ STABLE (HOME CHAT PUBLIC)
// ----------------------------------------------------------------------------
// FIXES:
// - No zombie state (finally always releases)
// - Optimistic state is source of truth
// - Backend hydrate only when needed
// - Mobile safe (no blur hacks, no draft dependency)
// - Restores: rename / archive / restore / delete
// ============================================================================

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { sendChatMessage } from "@/services/chatClient";
import { listSessions, loadSession } from "@/services/chatHistoryClient";
import { generateThreadTitle } from "./helpers/generateThreadTitle";
import api from "@/services/apiClient";

const DEFAULT_TITLE = "Nueva consulta jurídica";

// ----------------------------------------------------------------------------
// SAFE UUID (mobile/webview-proof)
// ----------------------------------------------------------------------------
function safeUUID() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

    if (typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;

      const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

// ----------------------------------------------------------------------------
// BACKEND: CREATE SESSION (never breaks UI)
// ----------------------------------------------------------------------------
async function apiCreateSession(sessionId, title) {
  await api.post("chat-sessions", { sessionId, title });
}

// ============================================================================
// MAIN HOOK
// ============================================================================
export function useGeneralChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messagesBySession, setMessagesBySession] = useState({});
  const [isDispatching, setIsDispatching] = useState(false);

  const isDispatchingRef = useRef(false);
  const bottomRef = useRef(null);

  // ----------------------------------------------------------------------------
  // DERIVED: current messages
  // ----------------------------------------------------------------------------
  const messages = useMemo(() => {
    if (!activeSessionId) return [];
    return messagesBySession[activeSessionId] || [];
  }, [messagesBySession, activeSessionId]);

  // ----------------------------------------------------------------------------
  // SESSIONS: refresh
  // ----------------------------------------------------------------------------
  const refreshSessions = useCallback(async () => {
    try {
      const raw = await listSessions();

      const normalized = (raw || []).map((s) => ({
        id: s.id,
        title: s.title || DEFAULT_TITLE,
        archived: !!s.archived,
        updatedAt: s.updatedAt || new Date().toISOString(),
        lastMessage: s.lastMessage || "", // optional if backend provides it
      }));

      setSessions(normalized);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // ----------------------------------------------------------------------------
  // HISTORY: manual hydrate (does NOT overwrite live state)
  // ----------------------------------------------------------------------------
  const loadMessagesOf = useCallback(async (sid) => {
    if (!sid) return;

    try {
      const data = await loadSession(sid);

      setMessagesBySession((prev) => {
        if ((prev[sid] || []).length > 0) return prev; // do not overwrite live
        return { ...prev, [sid]: Array.isArray(data) ? data : [] };
      });
    } catch {
      // silent
    }
  }, []);

  // ----------------------------------------------------------------------------
  // AUTO SCROLL (feed owns scroll)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  // ----------------------------------------------------------------------------
  // CREATE SESSION (frontend owns truth)
  // ----------------------------------------------------------------------------
  const createSession = useCallback(async (initialText) => {
    const sessionId = `thread_${safeUUID()}`;

    const title = initialText ? generateThreadTitle(initialText) : DEFAULT_TITLE;

    // ✅ Try backend, but never block UI
    try {
      await apiCreateSession(sessionId, title);
    } catch {
      // silent: session still exists locally
    }

    setSessions((prev) => [
      { id: sessionId, title, archived: false, updatedAt: new Date().toISOString() },
      ...prev,
    ]);

    setMessagesBySession((prev) => ({ ...prev, [sessionId]: [] }));
    setActiveSessionId(sessionId);

    return sessionId;
  }, []);

  // ----------------------------------------------------------------------------
  // DISPATCH MESSAGE (anti-race, mobile-safe, no draft dependency)
  // ----------------------------------------------------------------------------
  const dispatchMessage = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if (!text || isDispatchingRef.current) return;

      isDispatchingRef.current = true;
      setIsDispatching(true);

      let sid = activeSessionId;

      try {
        if (!sid) {
          sid = await createSession(text);
        }

        // 1) optimistic USER
        setMessagesBySession((prev) => ({
          ...prev,
          [sid]: [...(prev[sid] || []), { role: "user", content: text }],
        }));

        // 2) backend call (never breaks UI)
        let reply = "";
        let error = false;
        let code = null;

        try {
          const data = await sendChatMessage({
            channel: "home_chat",
            sessionId: sid,
            prompt: text,
          });

          reply =
            typeof data?.message === "string" && data.message.trim()
              ? data.message
              : "¿Deseas continuar con la consulta?";

          code = data?.code ?? null;
        } catch (err) {
          error = true;
          reply = err?.message || "⚠️ Error de conexión.";
          code = err?.code ?? null;
        }

        // 3) optimistic ASSISTANT
        setMessagesBySession((prev) => ({
          ...prev,
          [sid]: [
            ...(prev[sid] || []),
            {
              role: "assistant",
              content: reply,
              meta: { protocol: "R7.7+++" },
              error,
              code,
            },
          ],
        }));

        // 4) background hydrate (optional)
        Promise.resolve().then(() => {
          loadMessagesOf(sid);
          // refreshSessions(); // enable if your backend updates updatedAt/lastMessage
        });
      } finally {
        isDispatchingRef.current = false;
        setIsDispatching(false);
      }
    },
    [activeSessionId, createSession, loadMessagesOf]
  );

  // ----------------------------------------------------------------------------
  // SIDEBAR ACTIONS (RESTORED)
  // ----------------------------------------------------------------------------
  const renameSession = useCallback(async (sessionId, newTitle) => {
    const title = String(newTitle || "").trim();
    if (!sessionId || !title) return;

    // optimistic
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, title, updatedAt: new Date().toISOString() } : s
      )
    );

    try {
      await api.patch(`chat-sessions/${sessionId}`, { title });
    } catch {
      // optional: rollback if you want
    }
  }, []);

  const archiveSession = useCallback(
    async (sessionId) => {
      if (!sessionId) return;

      // optimistic
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, archived: true, updatedAt: new Date().toISOString() }
            : s
        )
      );

      try {
        await api.patch(`chat-sessions/${sessionId}`, { archived: true });
        refreshSessions();
      } catch {
        // optional rollback
      }
    },
    [refreshSessions]
  );

  const restoreSession = useCallback(
    async (sessionId) => {
      if (!sessionId) return;

      // optimistic
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, archived: false, updatedAt: new Date().toISOString() }
            : s
        )
      );

      try {
        await api.patch(`chat-sessions/${sessionId}`, { archived: false });
        refreshSessions();
      } catch {
        // optional rollback
      }
    },
    [refreshSessions]
  );

  const deleteSession = useCallback(
    async (sessionId) => {
      if (!sessionId) return;

      // optimistic
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setMessagesBySession((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });

      if (activeSessionId === sessionId) setActiveSessionId(null);

      try {
        await api.delete(`chat-sessions/${sessionId}`);
      } catch {
        // optional rollback (usually not necessary)
      }
    },
    [activeSessionId]
  );

  // ----------------------------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------------------------
  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    isDispatching,
    bottomRef,

    dispatchMessage,
    createSession,

    renameSession,
    archiveSession,
    restoreSession,
    deleteSession,

    loadMessagesOf,
    refreshSessions,
  };
}
