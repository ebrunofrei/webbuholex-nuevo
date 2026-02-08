// ============================================================================
// 🚩 featureFlags
// ----------------------------------------------------------------------------
// Resolves plan-based limits and entitlements.
// Keep deterministic. No LLM calls.
// ============================================================================

const DEFAULTS = {
  bubble: {
    dailyLimits: {
      simple: Infinity,
      legal_analysis: 3,
      deep_analysis: 1,
    },
    maxPdfChars: 12_000,
    maxComparisons: 1,
  },
};

export function resolveEntitlements({ plan = "bubble_free" } = {}) {
  switch (plan) {
    case "bubble_plus":
      return {
        ...DEFAULTS.bubble,
        dailyLimits: {
          simple: Infinity,
          legal_analysis: 20,
          deep_analysis: 5,
        },
        maxPdfChars: 60_000,
        maxComparisons: 5,
      };

    case "pro":
      // Pro is a different channel, but keep for completeness
      return {
        pro: true,
      };

    case "bubble_free":
    default:
      return DEFAULTS.bubble;
  }
}