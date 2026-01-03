import { buildNeutralStructure } from "../base/neutral.js";

export function buildPenalTemplate(briefing) {
  const base = buildNeutralStructure(briefing);

  return [
    {
      title: "SUMILLA",
      content: briefing.strategy?.summary,
    },
    ...base,
    {
      title: "RIESGOS PENALES CRÍTICOS",
      content: briefing.tensions?.critical,
    },
  ];
}
