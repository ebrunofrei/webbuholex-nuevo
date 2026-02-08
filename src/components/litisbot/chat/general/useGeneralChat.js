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
    if (activeSessionId) loadMessagesOf(activeSessionId);
  }, [activeSessionId, loadMessagesOf]);

  // ============================================================================
  // AUTO SCROLL
  // ============================================================================
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isDispatching]);

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
  // DISPATCH MESSAGE (NO RESET, NO RACE)
  // ============================================================================
  const dispatchMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || isDispatching) return;

    setIsDispatching(true);
    setDraft("");

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
        { role: "assistant", content: reply, meta: { protocol: "R7.7++" } },
      ],
    }));

    // 5️⃣ Background sync (NO navigation side effects)
    loadMessagesOf(sid);
    refreshSessions();

    setIsDispatching(false);
  }, [
    draft,
    isDispatching,
    activeSessionId,
    createSession,
    loadMessagesOf,
    refreshSessions,
  ]);

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
  };
}
