// ======================================================================
// 🧠 COGNITIVE PROFILES — LITIS (R7.6++)
// ----------------------------------------------------------------------
// Cognitive configuration presets.
// PURE DATA — no logic, no turn dependency.
// Consumed by buildCognitiveBlock.
// INTERNAL LANGUAGE: English only.
// ======================================================================

/**
 * Default cognitive profile (baseline).
 */
export const DEFAULT_COGNITIVE_PROFILE = {
  level: "general",

  profile: {
    depth: "medium",

    selectivity: {
      active: true,
      drivers: ["decisional_impact"],
      rule: "omit_non_decisive_doctrine",
    },

    orientation: {
      focus: "object_centered",
      avoid: ["academic_neutrality", "unnecessary_exhaustiveness"],
    },

    sciences: {
      activateOnlyIf: ["expertise", "methodology", "statistics"],
      role: "auxiliary",
    },

    ambiguity: {
      tolerance: "low",
      rule: "clarify_before_deciding",
    },

    closure: {
      mandatory: false,
      type: "neutral",
      avoid: "open_ended_responses",
    },
  },
};

/**
 * Senior litigating profile — main operating mode for LITIS.
 */
export const LITIGANTE_SENIOR_PROFILE = {
  level: "senior",

  profile: {
    depth: "high",

    selectivity: {
      active: true,
      drivers: [
        "ratio_decidendi",
        "procedural_impact",
        "legal_validity",
      ],
      rule: "exclude_non_decisional_content",
    },

    orientation: {
      focus: "decision_oriented",
      avoid: ["academic_neutrality", "descriptive_commentary"],
    },

    sciences: {
      activateOnlyIf: [
        "expert_report",
        "probative_valuation",
        "audit",
      ],
      role: "auxiliary",
    },

    ambiguity: {
      tolerance: "very_low",
      rule: "force_object_definition",
    },

    closure: {
      mandatory: true,
      type: "decisional",
      avoid: "hypothetical_or_open_conclusions",
    },
  },
};

/**
 * Analytical / doctrinal profile
 * Activated only on explicit request.
 */
export const ANALYTICAL_DOCTRINAL_PROFILE = {
  level: "analytical",

  profile: {
    depth: "high",

    selectivity: {
      active: false,
      drivers: ["systemic_coherence"],
      rule: "develop_with_explicit_structure",
    },

    orientation: {
      focus: "analytical",
      avoid: ["premature_conclusion"],
    },

    sciences: {
      activateOnlyIf: ["explicit_request"],
      role: "secondary",
    },

    ambiguity: {
      tolerance: "medium",
      rule: "explore_reasonable_alternatives",
    },

    closure: {
      mandatory: false,
      type: "open",
      avoid: "forced_decision",
    },
  },
};

/**
 * Cognitive profile registry.
 */
export const COGNITIVE_PROFILES = {
  default: DEFAULT_COGNITIVE_PROFILE,
  litigante: LITIGANTE_SENIOR_PROFILE,
  doctrinal: ANALYTICAL_DOCTRINAL_PROFILE,
};

export default {
  DEFAULT_COGNITIVE_PROFILE,
  LITIGANTE_SENIOR_PROFILE,
  ANALYTICAL_DOCTRINAL_PROFILE,
  COGNITIVE_PROFILES,
};
