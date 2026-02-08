// ======================================================================
// 🧠 HUMAN POLICY PROMPT — R7.6++ (i18n wrapper)
// ----------------------------------------------------------------------
// Selects the correct human policy text based on locale.
// Kernel passes { locale } automatically.
// ======================================================================

import { buildHumanPolicyLocale } from "./humanPolicyLocales.js";

export function buildHumanPolicyPrompt(locale = "es") {
  return buildHumanPolicyLocale(locale);
}

export default buildHumanPolicyPrompt;
