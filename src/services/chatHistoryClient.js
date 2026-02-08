import api from "@/services/apiClient";

/* ============================================================
   HOME CHAT — CANONICAL CLIENT
   apiClient YA incluye /api
============================================================ */

/**
 * LIST SESSIONS
 */
export async function listSessions() {
  try {
    return await api.get("chat-sessions");
  } catch (err) {
    console.error("🔥 listSessions error:", err);
    return [];
  }
}

/**
 * LOAD SESSION HISTORY
 */
export async function loadSession(sessionId) {
  if (!sessionId) return [];

  try {
    return await api.get("chat-messages", { sessionId });
  } catch (err) {
    console.error("🔥 loadSession error:", err);
    return [];
  }
}

/**
 * RENAME
 */
export async function renameSession(sessionId, title) {
  return api.patch(`chat-sessions/${sessionId}`, { title });
}

/**
 * DELETE
 */
export async function deleteSession(sessionId) {
  return api.delete(`chat-sessions/${sessionId}`);
}

/**
 * RESTORE
 */
export async function restoreSession(sessionId) {
  return api.patch(`chat-sessions/${sessionId}/restore`);
}
