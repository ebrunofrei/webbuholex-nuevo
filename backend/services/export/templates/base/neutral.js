export function buildNeutralStructure(briefing) {
  return [
    { title: "Identificación del caso", content: briefing.caseInfo },
    { title: "Resumen estratégico", content: briefing.strategy },
    { title: "Línea de tiempo jurídica", content: briefing.timeline },
    { title: "Tensiones del caso", content: briefing.tensions },
    { title: "Puntos de resiliencia", content: briefing.resilience },
    { title: "Zonas de maniobra", content: briefing.maneuvers },
    { title: "Puntos de no retorno", content: briefing.noReturn },
    { title: "Líneas rojas", content: briefing.redLines },
    { title: "Preparación para decisión humana", content: briefing.decisionPrep },
  ];
}
