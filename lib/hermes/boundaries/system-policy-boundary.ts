import type { HermesSystemMessage } from "../contracts/hermes-messages";

export interface SystemPolicyConfig {
  readonly requestedTier: "free_summary" | "specialized_analysis" | "professional_review";
  readonly locale: "es-PE"; // Enforced literal for strictness
}

const TIER_POLICY_MAPPING: Record<SystemPolicyConfig["requestedTier"], string> = {
  free_summary: "Tier: Free Summary. Provide a concise overview.",
  specialized_analysis: "Tier: Specialized Analysis. Provide detailed legal citations.",
  professional_review: "Tier: Professional Review. Flag all risks for human expert."
};

const LOCALE_POLICY_MAPPING: Record<SystemPolicyConfig["locale"], string> = {
  "es-PE": "Locale: Peru. Use Peruvian legal terminology."
};

export function buildHermesSystemPolicy(config: SystemPolicyConfig): HermesSystemMessage {
  // Pure policy creation without user text.
  // Using explicit, trusted application-defined constants instead of arbitrary interpolation.
  const tierPolicy = TIER_POLICY_MAPPING[config.requestedTier];
  const localePolicy = LOCALE_POLICY_MAPPING[config.locale];

  const content = `You are a legal analysis AI operating under strict guidelines.
${localePolicy}
${tierPolicy}

Respond strictly using the required structured output schema. Do not include introductory text.`;

  return {
    role: "system",
    content,
    classification: "TRUSTED_SYSTEM_POLICY"
  };
}
