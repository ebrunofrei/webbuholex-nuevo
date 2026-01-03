// backend/plazos/rulesets/pe/index.js
import { PE_CIVIL_ACTOS } from "./civil.actos.js";

export const PE_RULESET = {
  id: "pe",
  tzDefault: "America/Lima",
  domains: {
    civil: {
      id: "pe.civil",
      actos: PE_CIVIL_ACTOS,
    },
  },
};
