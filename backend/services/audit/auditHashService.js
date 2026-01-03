// ============================================================================
// 🔐 auditHashService — Hash encadenado de eventos
// ----------------------------------------------------------------------------
// - SHA-256
// - Determinista
// - Sin dependencias externas
// ============================================================================

import crypto from "crypto";

/**
 * Calcula el hash de un evento auditado
 * @param {Object} payload
 * @param {String|null} prevHash
 */
export function computeAuditHash(payload, prevHash = "") {
  const data = JSON.stringify({
    payload,
    prevHash,
  });

  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}
