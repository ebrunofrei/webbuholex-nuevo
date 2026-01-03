import civil from "./civil.js";
import penal from "./penal.js";
import administrativo from "./administrativo.js";

export const PERU_BASE = {
  country: "PE",
  tzDefault: "America/Lima",

  // Defaults universales dentro de Perú (ajustables por materia)
  workweek: [1, 2, 3, 4, 5], // lun-vie (0=dom)
  startRule: "next_day",     // "same_day" | "next_day"
  typeDefault: "habiles",    // "habiles" | "calendario"
  carryIfInhabil: true,      // si cae inhábil, corre al siguiente hábil
  cutOffHourLocal: 23,       // hora de corte local (puedes subirlo a config real)
  cutOffMinuteLocal: 59,

  // feriados: fuente y alcance
  holidays: {
    mode: "country",         // "country" | "region" | "custom"
    country: "PE",
  },

  notes: "Perú base (ajustable por materia/proceso).",
};

export default {
  id: "pe",
  label: "Perú",
  base: PERU_BASE,
  domains: {
    civil,
    penal,
    administrativo,
  },
};
