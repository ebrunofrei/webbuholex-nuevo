// backend/plazos/rulesets/peru/civil.js
export default {
  rulesetId: "pe.civil",
  tzDefault: "America/Lima",
  typeDefault: "habiles",
  startRule: "next_day",
  carryIfInhabil: true,
  workweek: "mon_fri",
  holidays: { mode: "country" },
  country: "PE",

  // ✅ defaults de agenda para TODO civil
  agendaTemplate: {
    minutesBefore: [1440, 180, 60], // 24h, 3h, 1h
    priority: "medium",
    tags: ["plazo", "civil"],
    notes: "Revisar escrito, anexos, tasa y cargo de notificación.",
  },

  actos: {
    apelacion: {
      rulesetId: "pe.civil.acto.apelacion",

      // ✅ override agenda específico
      agendaTemplate: {
        title: "Vence plazo: Apelación",
        priority: "high",
        tags: ["apelacion"],
        minutesBefore: [2880, 1440, 180], // 48h, 24h, 3h (se dedup + ordena)
        notes: "Ver agravios, anexos, tasa judicial, firma y cargo.",
      },
    },

    contestacion: {
      rulesetId: "pe.civil.acto.contestacion",
      agendaTemplate: {
        title: "Vence plazo: Contestación",
        priority: "high",
        tags: ["contestacion"],
      },
    },
  },
};
