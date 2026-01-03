import { buildPenalTemplate } from "./templates/penal/penal.template.js";
import { buildCivilTemplate } from "./templates/civil/civil.template.js";

import { buildNeutralStructure } from "./templates/base/neutral.js";

export function resolveTemplate(briefing, jurisdiction = "neutral") {
  switch (jurisdiction) {
    case "penal":
      return buildPenalTemplate(briefing);
    case "civil":
      return buildCivilTemplate(briefing);
    case "administrativo":
      return buildNeutralStructure(briefing);
    default:
      return buildNeutralStructure(briefing);
  }
}
    