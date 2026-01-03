import { verifyAuditChain } from "./auditVerifyService.js";

export async function buildAuditTimeline(caseId) {
  if (!caseId) return [];

  const [events, verification] = await Promise.all([
    AuditEvent.find({ caseId }).sort({ createdAt: 1 }).lean(),
    verifyAuditChain(caseId),
  ]);

  const integrityMap = new Map(
    verification.map((v) => [String(v.id), v.integrity])
  );

  return events.map((ev) => ({
    id: ev._id,
    at: ev.createdAt,
    type: ev.action?.type || "unknown",
    payload: ev.action?.payload || null,
    actor: ev.actor || null,
    confirmation: ev.confirmation || null,
    result: ev.result || null,

    hash: ev.hash || null,
    prevHash: ev.prevHash || null,

    integrity:
      integrityMap.get(String(ev._id)) || "unverified",
  }));
  function computeRiskLevel(integrity) {
  if (integrity === "broken") return "critical";
  if (integrity === "unverified") return "warning";
  return "ok";
    }
    const integrity = integrityMap.get(String(ev._id)) || "unverified";

    return {
    id: ev._id,
    at: ev.createdAt,
    type: ev.action?.type || "unknown",
    payload: ev.action?.payload || null,
    actor: ev.actor || null,
    confirmation: ev.confirmation || null,
    result: ev.result || null,

    hash: ev.hash || null,
    prevHash: ev.prevHash || null,
    integrity,

    // 🚦 UX-6.7
    riskLevel: computeRiskLevel(integrity),
    };

}

