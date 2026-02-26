// brain/legal/judicial/signals/ContradictionEngine.js
import { extractClaims } from "./contradictions/ClaimExtractor.js";
import { groupClaimsByTopic } from "./contradictions/GroupByTopic.js";
import { findContradictions } from "./contradictions/ContradictionMatcher.js";
import { buildReport } from "./contradictions/ReportBuilder.js";

export function runContradictionEngine({ text, sections, meta }) {
  if (!text || !Array.isArray(sections)) {
    return { contradictions: [], summary: { critical: 0, high: 0, medium: 0, low: 0, riskIndex: 0 } };
  }

  const claims = extractClaims({ text, sections, meta });
  const groups = groupClaimsByTopic(claims);
  const findings = findContradictions(groups, { meta });

  const report = buildReport(findings, { claims, groups, meta });
  return report;
}