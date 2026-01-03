import crypto from "crypto";

export function computeAuditHash(payload) {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash("sha256").update(stable).digest("hex");
}
