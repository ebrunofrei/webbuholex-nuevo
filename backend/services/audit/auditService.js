import AuditEvent from "../../models/AuditEvent.js";
import { computeAuditHash } from "./auditHashService.js";

export async function registerAuditEvent({
  caseId,
  chatId,
  action,
  confirmation,
  actor,
  result,
}) {
  if (!caseId || !action?.type || !confirmation?.confirmedByUser) {
    return null;
  }

  // 1️⃣ Obtener último evento del caso
  const lastEvent = await AuditEvent.findOne({ caseId })
    .sort({ createdAt: -1 })
    .lean();

  const prevHash = lastEvent?.hash || "";

  // 2️⃣ Payload estable para hashing
  const payloadForHash = {
    caseId,
    action,
    confirmation,
    actor,
    result,
  };

  // 3️⃣ Calcular hash
  const hash = computeAuditHash(payloadForHash, prevHash);

  // 4️⃣ Persistir evento
  return AuditEvent.create({
    caseId,
    chatId,
    action,
    confirmation,
    actor,
    result,

    hash,
    prevHash,
  });
}


