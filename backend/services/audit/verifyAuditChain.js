import AuditEvent from "../../models/AuditEvent.js";
import { computeAuditHash } from "./hashUtils.js";

export async function verifyAuditChain(caseId) {
  const events = await AuditEvent.find({ caseId })
    .sort({ createdAt: 1 })
    .lean();

  let previousHash = null;

  for (const ev of events) {
    const expectedHash = computeAuditHash({
      caseId: ev.caseId,
      chatId: ev.chatId,
      action: ev.action,
      confirmation: ev.confirmation,
      actor: ev.actor,
      result: ev.result,
      prevHash: previousHash,
    });

    if (ev.hash !== expectedHash) {
      return {
        ok: false,
        brokenAt: ev._id,
      };
    }

    previousHash = ev.hash;
  }

  return { ok: true };
}
