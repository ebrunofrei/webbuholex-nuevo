// src/core/security/validate.js

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateChatRequest(data) {
  assert(data && typeof data === "object", "Invalid payload.");
  assert(typeof data.channel === "string" && data.channel.length > 0, "Invalid channel.");
  assert(typeof data.sessionId === "string" && data.sessionId.length > 0, "Invalid sessionId.");
  assert(typeof data.prompt === "string" && data.prompt.trim().length > 0, "Empty prompt.");

  // Optional: history
  if (data.history != null) {
    assert(Array.isArray(data.history), "history must be an array.");
  }

  return true;
}
