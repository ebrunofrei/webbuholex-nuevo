import { LEGAL_SYSTEM_PRESETS } from "./LegalSystemPresets.js";
import { buildJurisdictionProfile } from "./JurisdictionProfile.js";

const normalizeSignals = (tags = {}) =>
  [
    ...(tags.dominio || []),
    ...(tags.objeto || []),
    ...(tags.proceso || []),
  ].map((s) => String(s).toLowerCase().trim());

export default function SystemDetector({ llmContext }) {
  if (!llmContext || llmContext.meta?.resetAll) return null;

  const tags = llmContext.systemBlocks?.tags || {};
  const signals = normalizeSignals(tags);
  const DOMINANCE_THRESHOLD = 4; // 🔒 mínimo para flip real
  const score = {
    civil_law_classic: 0,
    common_law_adversarial: 0,
    mixed_civil_common: 0,
    constitutional_supremacy: 0,
    administrative_regulatory: 0,
  };
  
  for (const signal of signals) {
    if (signal.includes("amparo") || signal.includes("tutela")) {
      score.mixed_civil_common += 3;
      score.constitutional_supremacy += 4;
    }

    if (signal.includes("discovery") || signal.includes("binding precedent")) {
      score.common_law_adversarial += 5;
    }

    if (signal.includes("administrative act") || signal.includes("acto administrativo")) {
      score.administrative_regulatory += 4;
    }

    if (signal.includes("codigo")) {
      score.civil_law_classic += 2;
    }
  }

    let selectedSystem = "civil_law_classic";
    let maxScore = score[selectedSystem];

    for (const [system, value] of Object.entries(score)) {
    if (value > maxScore + DOMINANCE_THRESHOLD) {
        maxScore = value;
        selectedSystem = system;
    }
    }

  const confidence = maxScore >= 6 ? "high" : maxScore >= 4 ? "medium" : "low";
  const preset = LEGAL_SYSTEM_PRESETS[selectedSystem];

  return buildJurisdictionProfile({
    legalSystem: selectedSystem,
    confidence,
    ...preset,
    detectionSignals: signals,
  });
}

