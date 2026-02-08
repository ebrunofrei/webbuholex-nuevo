// src/components/litisbot/chat/bubble/utils/bubbleSession.js
// ============================================================================
// 🫧 Bubble Session Manager — R7.7++
// - Fuente única de verdad para sessionId del Bubble
// - Persistente en sessionStorage
// - Aislado de Home / Pro chat
// ============================================================================

const STORAGE_KEY = "bubble_session_id";

export function getOrCreateBubbleSessionId() {
  if (typeof window === "undefined") return null;

  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

export function clearBubbleSessionId() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
