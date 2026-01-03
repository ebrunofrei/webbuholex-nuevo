// ============================================================================
// 🔐 auditVerifyService — Verificación de cadena de auditoría (FASE E-2)
// ----------------------------------------------------------------------------
// - Recalcula hashes
// - Detecta rupturas
// - NO modifica datos
// ============================================================================

import AuditEvent from "../../models/AuditEvent.js";
import { computeAuditHash } from "./auditHashService.js";

/**
 * Verifica la cadena de auditoría de un caso
 * @param {string} caseId
 * @returns {Array<{id, integrity}>}
 */
export async function verifyAuditChain(caseId) {
  if (!caseId) return [];

  // 1️⃣ Traer eventos en orden cronológico
  const events = await AuditEvent.find({ caseId })
    .sort({ createdAt: 1 })
    .lean();

  let prevHash = "";
  let chainBroken = false;

  return events.map((ev) => {
    // Eventos antiguos sin hash
    if (!ev.hash) {
      return {
        id: ev._id,
        integrity: "unverified",
      };
    }

    // Recalcular hash esperado
    const expectedHash = computeAuditHash(
      {
        caseId: ev.caseId,
        action: ev.action,
        confirmation: ev.confirmation,
        actor: ev.actor,
        result: ev.result,
      },
      prevHash
    );

    // Comparar
    const isValid = ev.hash === expectedHash && ev.prevHash === prevHash;

    const integrity = chainBroken
      ? "broken"
      : isValid
      ? "valid"
      : "broken";

    // Si se rompe, todo lo siguiente queda roto
    if (!isValid) chainBroken = true;

    // Avanzar hash
    prevHash = ev.hash;

    return {
      id: ev._id,
      integrity,
    };
  });
}
