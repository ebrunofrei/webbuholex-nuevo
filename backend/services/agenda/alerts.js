// ============================================================
// 🧠 Alertas Inteligentes (Fase A – Estable)
// ------------------------------------------------------------
// - Detecta alertas ANTES del vencimiento (no después).
// - Ignora eventos ya vencidos (no se alerta vencimientos).
// - Soporta minutesBefore como número o array.
// - NO usa cron, NO usa persistencia.
// - Preparado para Fase B (UX) y Fase C (Scheduler).
// ============================================================

const DEFAULT_MINUTES_BEFORE = 120;       // 2 horas
const MAX_LOOKAHEAD_SECONDS   = 90 * 86400; // 90 días

// ------------------------------------------------------------
// Utilidades internas
// ------------------------------------------------------------
function asNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeMinutesBefore(input) {
  // Caso arreglo
  if (Array.isArray(input)) {
    const mins = input
      .map(asNum)
      .filter(v => v != null && v >= 0);

    if (mins.length) {
      // Orden descendente: primero minutos más grandes
      return [...new Set(mins)].sort((a, b) => b - a);
    }

    return [DEFAULT_MINUTES_BEFORE];
  }

  // Caso número único
  const n = asNum(input);
  return n != null && n >= 0
    ? [n]
    : [DEFAULT_MINUTES_BEFORE];
}

// ============================================================
// 🟢 computeAgendaAlert(ev, nowUnix)
//
// Lógica empresarial de alerta:
//
// Dispara SI:
//   nowUnix >= (endUnix - m*60)
//   AND nowUnix < endUnix
//
// No dispara SI:
//   - Evento ya venció (now >= endUnix)
//   - minutesBefore inválidos
//   - endUnix inválido
//
// Retorna:
//   {
//     kind: "due",
//     risk: "low" | "med" | "high",
//     remainingSeconds,
//     triggers: [ { minutesBefore, alertAtUnix } ],
//     endUnix
//   }
// ============================================================
export function computeAgendaAlert(ev, nowUnix) {
  const now     = asNum(nowUnix);
  const endUnix = asNum(ev?.endUnix);

  if (!now || !endUnix) return null;

  // Ignora eventos vencidos
  if (now >= endUnix) return null;

  const minsArr   = normalizeMinutesBefore(ev?.minutesBefore ?? ev?.minutesBeforeArr);
  const remaining = endUnix - now;

  const triggers = [];

  for (const m of minsArr) {
    const alertAt = endUnix - m * 60;

    if (now >= alertAt && now < endUnix) {
      triggers.push({
        minutesBefore: m,
        alertAtUnix  : alertAt
      });
    }
  }

  if (!triggers.length) return null;

  // ------------------------------------------------------------
  // Heurística empresarial de riesgo (puede evolucionar Fase B)
  // ------------------------------------------------------------
  let risk = "low";
  if (remaining <= 30 * 60)     risk = "high";  // < 30 min
  else if (remaining <= 2*3600) risk = "med";   // < 2 horas

  return {
    kind: "due",
    risk,
    remainingSeconds: remaining,
    triggers,
    endUnix
  };
}

// ============================================================
// 🟦 buildAlertWindow(nowUnix, horizonSeconds)
//
// Define intervalo de búsqueda de candidatos:
//   from = now
//   to   = now + horizon
//
// Límites:
//   - mínimo 60s
//   - máximo 90 días
//
// Retorna:
//   { fromUnix, toUnix } o null si nowUnix inválido
// ============================================================
export function buildAlertWindow(nowUnix, horizonSeconds = 14 * 86400) {
  const now = asNum(nowUnix);
  if (!now) return null;

  const h = Math.min(
    Math.max(60, Number(horizonSeconds) || 0),
    MAX_LOOKAHEAD_SECONDS
  );

  return {
    fromUnix: now,
    toUnix  : now + h
  };
}
