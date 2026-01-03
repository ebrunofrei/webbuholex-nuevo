export function buildCivilTemplate(briefing) {
  return [
    { title: "PRETENSIÓN PRINCIPAL", content: briefing.strategy?.goal },
    { title: "FUNDAMENTOS FÁCTICOS", content: briefing.timeline },
    { title: "RIESGOS PROBATORIOS", content: briefing.tensions },
    { title: "ESTRATEGIA PROCESAL", content: briefing.maneuvers },
    { title: "LÍMITES ESTRATÉGICOS", content: briefing.redLines },
  ];
}
