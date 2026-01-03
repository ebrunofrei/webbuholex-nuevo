export const PE_CIVIL_APELACION = {
  rulesetId: "pe.civil.apelacion",
  tzDefault: "America/Lima",
  typeDefault: "habiles",
  startRule: "next_day",
  carryIfInhabil: true,
  workweek: "mon_fri",
  holidays: { mode: "country" },
  country: "pe",

  // Ejemplo: reglas extra del acto (si luego las usas)
  // extraHolidays: [],
  // cantidadDefault: 10,
};
