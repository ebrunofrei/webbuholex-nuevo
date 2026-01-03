// backend/plazos/engine/resolveRuleset.js
import { RULESETS } from "../rulesets/registry.js";

function norm(x) {
  return String(x || "").trim().toLowerCase();
}

function uniqNums(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.sort((a, b) => b - a); // por comodidad: 1440, 180, 60...
}

// merge superficial + merges específicos (holidays, extraHolidays, agendaTemplate)
function mergeConfig(base = {}, extra = {}) {
  const out = { ...base, ...extra };

  // holidays: merge de objetos
  if (base.holidays || extra.holidays) {
    out.holidays = { ...(base.holidays || {}), ...(extra.holidays || {}) };
  }

  // extraHolidays: concat
  if (Array.isArray(base.extraHolidays) || Array.isArray(extra.extraHolidays)) {
    out.extraHolidays = [
      ...(Array.isArray(base.extraHolidays) ? base.extraHolidays : []),
      ...(Array.isArray(extra.extraHolidays) ? extra.extraHolidays : []),
    ];
  }

  // ✅ agendaTemplate: merge y normalización
  if (base.agendaTemplate || extra.agendaTemplate) {
    const b = base.agendaTemplate || {};
    const e = extra.agendaTemplate || {};
    const merged = { ...b, ...e };

    // minutesBefore: permite number o array
    const mbBase = Array.isArray(b.minutesBefore)
      ? b.minutesBefore
      : (b.minutesBefore != null ? [b.minutesBefore] : []);

    const mbExtra = Array.isArray(e.minutesBefore)
      ? e.minutesBefore
      : (e.minutesBefore != null ? [e.minutesBefore] : []);

    const mb = uniqNums([...mbBase, ...mbExtra]);

    if (mb.length) merged.minutesBefore = mb;

    // tags: concat + unique
    const tagsBase = Array.isArray(b.tags) ? b.tags : [];
    const tagsExtra = Array.isArray(e.tags) ? e.tags : [];
    if (tagsBase.length || tagsExtra.length) {
      const set = new Set([...tagsBase, ...tagsExtra].map((t) => String(t).trim()).filter(Boolean));
      merged.tags = Array.from(set);
    }

    out.agendaTemplate = merged;
  }

  return out;
}

/**
 * Jerarquía real:
 * A) Ruleset DIRECTO por acto (si existe): pe.civil.acto.apelacion
 * B) Ruleset base por dominio: pe.civil  (y dentro: base.actos.apelacion)
 * C) pe.default
 * D) global.default
 *
 * Nota: aunque exista A), igual puedes decidir que A "herede" de pe.civil si quieres.
 * Aquí lo mantenemos simple: si existe A, se usa tal cual; si no, cae a B y aplica override interno.
 */
export function resolveRuleset({ country = "PE", domain = "civil", acto = null } = {}) {
  const c = norm(country) || "pe";
  const d = norm(domain) || "civil";
  const a = norm(acto);

  const idActoDirecto = a ? `${c}.${d}.acto.${a}` : null;
  const idBaseDominio = `${c}.${d}`;
  const idDefaultPais = `${c}.default`;
  const idDefaultGlobal = "global.default";

  const candidates = [
    ...(idActoDirecto ? [idActoDirecto] : []),
    idBaseDominio,
    idDefaultPais,
    idDefaultGlobal,
  ];

  let pickedId = null;
  let picked = null;

  for (const id of candidates) {
    if (RULESETS[id]) {
      pickedId = id;
      picked = RULESETS[id];
      break;
    }
  }

  // fallback mínimo viable si no existe registry (no debería pasar)
  if (!picked) {
    pickedId = idDefaultGlobal;
    picked =
      RULESETS[idDefaultGlobal] || {
        rulesetId: "global.default",
        tzDefault: "America/Lima",
        typeDefault: "habiles",
        startRule: "next_day",
        carryIfInhabil: true,
        workweek: "mon_fri",
        holidays: { mode: "none" },
        country: "global",
      };
  }

  // ✅ Si el elegido fue el baseDominio, y hay override por acto en base.actos, se aplica
  let config = picked;
  let hasActoOverride = false;

  if (pickedId === idBaseDominio && a && picked?.actos && picked.actos[a]) {
    config = mergeConfig(picked, picked.actos[a]);
    hasActoOverride = true;

    // rulesetId coherente
    config.rulesetId = config.rulesetId || idActoDirecto || `${c}.${d}.acto.${a}`;
  }

  // Normaliza rulesetId
  const rulesetId = config?.rulesetId || pickedId;

  return {
    rulesetId,
    config,
    trail: {
      candidates,
      pickedId,
      pickedRulesetId: picked?.rulesetId || null,
      hasActoOverride,
      acto: a || null,
      country: c,
      domain: d,
    },
  };
}

export default resolveRuleset;
