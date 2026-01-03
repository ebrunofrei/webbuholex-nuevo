// backend/plazos/rulesets/registry.js

import PE_CIVIL from "./peru/civil.js";
import PE_PENAL from "./peru/penal.js";
import PE_ADMIN from "./peru/administrativo.js";

export const RULESETS = {
  "pe.civil": PE_CIVIL,
  "pe.penal": PE_PENAL,
  "pe.administrativo": PE_ADMIN,

  "pe.default": PE_CIVIL,

  "global.default": {
    rulesetId: "global.default",
    tzDefault: "UTC",
    typeDefault: "habiles",
    startRule: "next_day",
    carryIfInhabil: true,
    workweek: "mon_fri",
    holidays: { mode: "none" },
    country: "global",
  },
};

export default RULESETS;
