// ============================================================================
// LITIS | useGeneralChat — R7.7++ FINAL (HOME CHAT PUBLIC)
// ----------------------------------------------------------------------------
// - Home Chat = público (NO login)
// - sessionId frontend-owned (thread_*)
// - Sidebar sync sin tocar navegación
// - Cero race conditions, cero resets
// ============================================================================

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { sendChatMessage } from "@/services/chatClient";
import { listSessions, loadSession } from "@/services/chatHistoryClient";
import { generateThreadTitle } from "./helpers/generateThreadTitle";
import api from "@/services/apiClient";

const DEFAULT_TITLE = "Nueva consulta jurídica";

// ============================================================================
// BACKEND: CREATE SESSION (canonical)
// ============================================================================
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
  const [draft, setDraft] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const isDispatchingRef = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const bottomRef = useRef(null);

  // ============================================================================
  // DERIVED: CURRENT MESSAGES
  // ============================================================================
  const messages = useMemo(() => {
    return messagesBySession[activeSessionId] || [];
  }, [messagesBySession, activeSessionId]);

  // ============================================================================
  // LOAD SESSIONS (SIDEBAR ONLY — NO NAVIGATION SIDE EFFECTS)
  // ============================================================================
  const refreshSessions = useCallback(async () => {
    const raw = await listSessions();

    const normalized = (raw || []).map((s) => ({
      id: s.id,
      title: s.title || DEFAULT_TITLE,
      archived: !!s.archived,
      updatedAt: s.updatedAt,
    }));

    setSessions(normalized);
  }, []);

  useEffect(() => {
    refreshSessions().catch(() => {});
  }, [refreshSessions]);

  // ============================================================================
  // LOAD HISTORY FOR ACTIVE SESSION
  // ============================================================================
  const loadMessagesOf = useCallback(async (sid) => {
    if (!sid) return;

    const data = await loadSession(sid);

    setMessagesBySession((prev) => ({
      ...prev,
      [sid]: Array.isArray(data) ? data : [],
    }));
  }, []);

  useEffect(() => {
  if (!activeSessionId) return;

  let cancelled = false;

  (async () => {
    try {
      const data = await loadSession(activeSessionId);
      if (cancelled) return;

      setMessagesBySession((prev) => ({
        ...prev,
        [activeSessionId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      // silencioso
    }
  })();

  return () => {
    cancelled = true;
  };
}, [activeSessionId]);

  // ============================================================================
  // AUTO SCROLL
  // ============================================================================
  useEffect(() => {
  if (!bottomRef.current) return;

  bottomRef.current.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}, [messages.length]);

  // ============================================================================
  // CREATE SESSION (SINGLE SOURCE OF TRUTH)
  // ============================================================================
  const createSession = useCallback(async (initialText) => {
    const sessionId = `thread_${crypto.randomUUID()}`;

    const title = initialText
      ? generateThreadTitle(initialText)
      : DEFAULT_TITLE;

    await apiCreateSession(sessionId, title);

    setSessions((prev) => [
      {
        id: sessionId,
        title,
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    setMessagesBySession((prev) => ({
      ...prev,
      [sessionId]: [],
    }));

    setActiveSessionId(sessionId);

    return sessionId;
  }, []);

 // ============================================================================
// DISPATCH MESSAGE (NO RESET, NO RACE, MOBILE-SAFE)
// ============================================================================
const dispatchMessage = useCallback(async () => {
  const text = draft.trim();
  if (!text || isDispatchingRef.current) return;

  isDispatchingRef.current = true;
  setIsDispatching(true);
  setDraft("");

  try {
    let sid = activeSessionId;

    // 1️⃣ Create session if needed
    if (!sid) {
      sid = await createSession(text);
    }

    // 2️⃣ Optimistic USER message
    setMessagesBySession((prev) => ({
      ...prev,
      [sid]: [...(prev[sid] || []), { role: "user", content: text }],
    }));

    // 3️⃣ Send to backend
    let reply = "";

    try {
      const res = await sendChatMessage({
        channel: "home_chat",
        sessionId: sid,
        prompt: text,
      });

      reply =
        typeof res?.message === "string" && res.message.trim()
          ? res.message
          : "He procesado tu consulta jurídica.";
    } catch (err) {
      reply = err?.message || "⚠️ Error de conexión.";
    }

    // 4️⃣ Optimistic ASSISTANT message
    setMessagesBySession((prev) => ({
      ...prev,
      [sid]: [
        ...(prev[sid] || []),
        {
          role: "assistant",
          content: reply,
          meta: { protocol: "R7.7++" },
        },
      ],
    }));

    // 5️⃣ Background sync (NO navigation side effects)
    loadMessagesOf(sid);
    refreshSessions();
  } finally {
    // 🔒 SIEMPRE se libera el lock (clave en móvil)
    isDispatchingRef.current = false;
    setIsDispatching(false);
  }
}, [
  draft,
  activeSessionId,
  createSession,
  loadMessagesOf,
  refreshSessions,
]);

  // ============================================================================
  // SIDEBAR ACTIONS (CANONICAL — NO UX SIDE EFFECTS)
  // ============================================================================

  const renameSession = useCallback(async (sessionId, newTitle) => {
    if (!sessionId || !newTitle?.trim()) return;

    try {
      await api.patch(`chat-sessions/${sessionId}`, {
        title: newTitle.trim(),
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title: newTitle.trim(),
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    } catch {
      // UX > persistencia (silencioso)
    }
  }, []);

  const archiveSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    try {
      await api.patch(`chat-sessions/${sessionId}`, {
        archived: true,
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                archived: true,
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
      refreshSessions();

    } catch {
      // UX > persistencia
    }
    }, [refreshSessions]);

  const restoreSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    try {
      await api.patch(`chat-sessions/${sessionId}`, {
        archived: false,
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                archived: false,
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
      refreshSessions();

    } catch {
      // UX > persistencia
    }
  }, [refreshSessions]);

  const deleteSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    try {
      await api.delete(`chat-sessions/${sessionId}`);

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      setMessagesBySession((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch {
      // UX > persistencia
    }
  }, [activeSessionId]);
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    draft,
    setDraft,
    isDispatching,
    isSidebarOpen,
    setIsSidebarOpen,
    bottomRef,
    dispatchMessage,
    createSession,
    renameSession,
    archiveSession,
    restoreSession,
    deleteSession,
  };
}
