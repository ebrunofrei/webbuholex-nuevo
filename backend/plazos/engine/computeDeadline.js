import { resolveRuleset } from "./resolveRuleset.js";
import { getHolidaysSet, isWeekend } from "./holidaysProvider.js";

// -----------------------------
// Helpers
// -----------------------------
function toDateFromInput({ startISO, startUnix }) {
  if (startISO) {
    const d = new Date(startISO);
    if (Number.isNaN(d.getTime())) throw new Error("startISO inválido");
    return d;
  }
  if (startUnix != null) {
    const ms = Number(startUnix) * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) throw new Error("startUnix inválido");
    return d;
  }
  return new Date();
}

function addDaysUTC(dt, n) {
  const x = new Date(dt);
  x.setUTCDate(x.getUTCDate() + n); // UTC-safe para plazos por “día”
  return x;
}

function ymdUTC(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// -----------------------------
// Main
// -----------------------------
export async function computeDeadline(input = {}) {
  const {
    // tz es metadato/formateo. El cómputo diario se hace en UTC
    tz,

    // rulesets
    country = "PE",
    domain = "civil",
    acto = null,

    // cálculo
    tipo, // "habiles" | "calendario"
    cantidad = 0,

    // inicio
    startISO,
    startUnix,

    // overrides
    holidays: overrideHolidays, // array "YYYY-MM-DD" opcional
    ajusteInhabil,              // override del carry
  } = input;

  // 1) Resolver ruleset
  // Esperamos: { rulesetId, config }
  const rr = resolveRuleset({ country, domain, acto });
  const cfg = rr?.config || {};

  const tzFinal = tz || cfg.tzDefault || "America/Lima";

  const n = Number(cantidad ?? cfg.cantidad ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error("cantidad inválida");

  const finalTipo = String(tipo || cfg.tipo || cfg.typeDefault || "habiles")
    .toLowerCase()
    .trim();

  // 2) Inicio
  const start = toDateFromInput({ startISO, startUnix });

  // Regla de inicio
  const startRule = cfg.startRule || "next_day";
  let cursor = new Date(start);
  if (startRule === "next_day") cursor = addDaysUTC(cursor, 1);

  // 3) Providers: feriados por año
  const holidaysMode = cfg.holidays?.mode || "country";

  // Normaliza workweek: acepta "mon_fri" o "mon-fri"
  const workweek = String(cfg.workweek || "mon-fri").replace("_", "-");

  const cacheByYear = new Map(); // year -> Set("YYYY-MM-DD")

  async function getSetForYear(year) {
    if (cacheByYear.has(year)) return cacheByYear.get(year);

    let set = await getHolidaysSet({
      country: cfg.country || country,
      year,
      mode: holidaysMode,
    });

    // override total
    if (Array.isArray(overrideHolidays)) {
      set = new Set(overrideHolidays);
    } else if (Array.isArray(cfg.extraHolidays) && cfg.extraHolidays.length) {
      // extraHolidays del ruleset
      for (const d of cfg.extraHolidays) set.add(d);
    }

    cacheByYear.set(year, set);
    return set;
  }

  async function isInhabilUTC(d) {
    // ✅ aquí estaba el bug: NO existe "rules"
    if (isWeekend(d, workweek)) return true;

    const year = d.getUTCFullYear();
    const set = await getSetForYear(year);
    return set.has(ymdUTC(d));
  }

  // 4) Cálculo
  let end = new Date(cursor);

  if (finalTipo === "calendario") {
    end = addDaysUTC(cursor, n);
  } else {
    // hábiles
    let remaining = n;

    while (remaining > 0) {
      if (!(await isInhabilUTC(end))) remaining -= 1;
      if (remaining > 0) end = addDaysUTC(end, 1);
    }
  }

  // 5) Ajuste: si cae inhábil -> corre al siguiente hábil
  const carryIfInhabil =
    ajusteInhabil != null ? !!ajusteInhabil : cfg.carryIfInhabil !== false;

  if (carryIfInhabil) {
    while (await isInhabilUTC(end)) end = addDaysUTC(end, 1);
  }

  // 6) Trail
  const yearsTouched = Array.from(cacheByYear.keys()).sort((a, b) => a - b);
  const holidaysCountByYear = {};
  for (const y of yearsTouched) holidaysCountByYear[y] = cacheByYear.get(y)?.size || 0;

  return {
    ok: true,
    tz: tzFinal,

    input: {
      startISO: start.toISOString(),
      startUnix: Math.floor(start.getTime() / 1000),
      tipo: finalTipo,
      cantidad: n,
      country,
      domain,
      acto,
      rulesetId: rr?.rulesetId || `${String(country).toLowerCase()}.${String(domain).toLowerCase()}`,
      overrideHolidays: Array.isArray(overrideHolidays),
    },

    result: {
      endISO: end.toISOString(),
      endUnix: Math.floor(end.getTime() / 1000),
    },

    trail: [
      { step: "ruleset", rulesetId: rr?.rulesetId || null, picked: rr?.trail || null, config: cfg || null },
      { step: "start_rule", startRule },
      { step: "calendar", type: finalTipo, count: n },
      { step: "workweek", workweek },
      { step: "holidays", mode: holidaysMode, yearsTouched, holidaysCountByYear },
      { step: "carry", carryIfInhabil },
      {
        step: "notes",
        note:
          "Cómputo diario UTC-safe. tz se usa para metadatos/formateo. Si necesitas cómputo por hora en tz real, usa Temporal/Luxon.",
      },
    ],
  };
}
