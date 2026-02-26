// litisbot/chat-pro/services/chatStorage.js

export const ROOT_SESSION_ID = "__ROOT__";

export function getChatStorageKey({ usuarioId, contextId, sessionId }) {
  if (!usuarioId || !contextId || !sessionId) return null;
  return `litisbot:chat:${usuarioId}:${contextId}:${sessionId}`;
}

export function safeJsonParse(raw, fallback = []) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function stripPlaceholders(messages = []) {
  return messages.filter((m) => !m?._placeholder);
}