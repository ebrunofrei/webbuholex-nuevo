// ============================================================================
// LITIS | useGeneralChat — R7.7+++ STABLE (HOME CHAT PUBLIC)
// ----------------------------------------------------------------------------
// FIXES:
// - ❌ No auto-reload por activeSessionId (zombie fix)
// - ✅ Optimistic state is source of truth
// - ✅ Backend hydrate SOLO cuando corresponde
// - ✅ Mobile real safe
// ============================================================================

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { sendChatMessage } from "@/services/chatClient";
import { listSessions, loadSession } from "@/services/chatHistoryClient";
import { generateThreadTitle } from "./helpers/generateThreadTitle";
import api from "@/services/apiClient";

const DEFAULT_TITLE = "Nueva consulta jurídica";

// ============================================================================
// SAFE UUID (mobile/webview-proof)
// ============================================================================
function safeUUID() {
  // Modern browsers
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

    // Fallback: RFC4122-ish using getRandomValues
    if (typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);

      // Set version (4) and variant bits
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;

      const hex = [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }

  // Last resort
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

// ============================================================================
// BACKEND: CREATE SESSION
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
  // LOAD SESSIONS (SIDEBAR ONLY)
  // ============================================================================
  const refreshSessions = useCallback(async () => {
    try {
      const raw = await listSessions();

      const normalized = (raw || []).map((s) => ({
        id: s.id,
        title: s.title || DEFAULT_TITLE,
        archived: !!s.archived,
        updatedAt: s.updatedAt,
      }));

      setSessions(normalized);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // ============================================================================
  // LOAD HISTORY (MANUAL — SAFE)
  // ============================================================================
  const loadMessagesOf = useCallback(async (sid) => {
    if (!sid) return;

    try {
      const data = await loadSession(sid);

      setMessagesBySession((prev) => {
        // 🛡️ BLINDAJE: no sobrescribir estado vivo
        if ((prev[sid] || []).length > 0) return prev;

        return {
          ...prev,
          [sid]: Array.isArray(data) ? data : [],
        };
      });
    } catch {
      // silencioso
    }
  }, []);

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
  // CREATE SESSION (FRONTEND OWNS TRUTH)
  // ============================================================================
  const createSession = useCallback(async (initialText) => {
    const sessionId = `thread_${safeUUID()}`;

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
  // DISPATCH MESSAGE (ANTI-RACE, MOBILE SAFE)
  // ============================================================================
  const dispatchMessage = useCallback(async () => {
    const text = draft.trim();
    if (!text || isDispatchingRef.current) return;

    isDispatchingRef.current = true;
    setIsDispatching(true);
    setDraft("");

    let sid = activeSessionId;

    try {
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
            meta: { protocol: "R7.7+++" },
          },
        ],
      }));

      // 5️⃣ Background sync (NO overwrite)
      setTimeout(() => {
        loadMessagesOf(sid);
        refreshSessions();
      }, 300);
    } finally {
      // 🔒 Release lock (CRÍTICO EN MÓVIL)
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
  // SIDEBAR ACTIONS
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
            ? { ...s, title: newTitle.trim(), updatedAt: new Date().toISOString() }
            : s
        )
      );
    } catch {}
  }, []);

  const archiveSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    try {
      await api.patch(`chat-sessions/${sessionId}`, { archived: true });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, archived: true, updatedAt: new Date().toISOString() }
            : s
        )
      );

      refreshSessions();
    } catch {}
  }, [refreshSessions]);

  const restoreSession = useCallback(async (sessionId) => {
    if (!sessionId) return;

    try {
      await api.patch(`chat-sessions/${sessionId}`, { archived: false });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, archived: false, updatedAt: new Date().toISOString() }
            : s
        )
      );

      refreshSessions();
    } catch {}
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
    } catch {}
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
    loadMessagesOf, // 👈 manual load (sidebar click)
  };
}
