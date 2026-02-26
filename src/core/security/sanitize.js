// src/core/security/sanitize.js
import { sanitizeObject } from "./sanitizeObject";

export function sanitizePayload(payload) {
  return sanitizeObject(payload, {
    escapeStrings: true,
    maxString: 12000,
  });
}
