// brain/legal/judicial/signals/contradictions/Severity.js
export function severityFor(finding) {
  // V1: reglas simples + confianza
  if (finding.type === "direct" && finding.confidence >= 0.8) return "high";
  if (finding.type === "temporal" && finding.confidence >= 0.8) return "high";
  if (finding.type === "numeric") return "medium";
  if (finding.type === "role") return "high";
  return "low";
}