import peru from "./peru/index.js";

export const RULESETS = {
  pe: peru,
};

export function getRuleset(countryCode = "PE") {
  const key = String(countryCode || "PE").toLowerCase();
  return RULESETS[key] || RULESETS.pe;
}
