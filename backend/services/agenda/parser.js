// ============================================================
// 🗓️ Agenda Parser – CANONICAL (Enterprise 2025)
// ------------------------------------------------------------
// CREATE:
//   - Fecha + hora => draft HIGH
//   - Fecha humana implícita SOLO para CREATE
// QUERY:
//   - Día / rango / período humano (estricto)
// Seguridad:
//   - Evita falsos positivos legales
// ============================================================

/* ============================================================
 * CONSTANTES
 * ========================================================== */

const MONTHS_ES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  setiembre: 9,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/* ============================================================
 * UTILIDADES BASE
 * ========================================================== */

function safeStr(v, maxLen = 12000) {
  if (v == null) return "";
  return String(v).replace(/\n{3,}/g, "\n\n").trim().slice(0, maxLen);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Evita confundir fechas/horas con referencias legales
 */
function looksLikeLegalNumberContext(text = "", index = 0) {
  const left = text.slice(Math.max(0, index - 18), index).toLowerCase();
  const right = text.slice(index, Math.min(text.length, index + 18)).toLowerCase();
  const win = left + right;

  return /(art\.?|art[ií]culo|exp\.?|expediente|ley|res\.?|resoluci[oó]n|casaci[oó]n|rn|r\.n\.|oficio|fojas|folio|c[oó]digo|cpp|cpc)/i.test(
    win
  );
}

/* ============================================================
 * ZONA HORARIA
 * ========================================================== */

function nowInTimeZone(tz = "UTC") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00`);
}

/* ============================================================
 * FECHAS ABSOLUTAS
 * ========================================================== */

function parseDDMMYYYY(text) {
  const s = String(text || "");
  const m = s.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (!m) return null;

  const idx = m.index ?? 0;
  if (looksLikeLegalNumberContext(s, idx)) return null;

  let dd = Number(m[1]);
  let mm = Number(m[2]);
  let yyyy = Number(m[3]);

  if (yyyy < 100) yyyy += 2000;
  if (yyyy < 1900 || yyyy > 2100) return null;
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;

  return { dd, mm, yyyy, _idx: idx };
}

function parseFechaEspanol(text) {
  const s = String(text || "");
  const re =
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+(?:de|del)\s+(\d{4})\b/i;

  const m = s.match(re);
  if (!m) return null;

  const idx = m.index ?? 0;

  const dd = Number(m[1]);
  const mm = MONTHS_ES[(m[2] || "").toLowerCase()];
  const yyyy = Number(m[3]);

  if (!mm || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) return null;

  return { dd, mm, yyyy, _idx: idx };
}

function pickDate(text) {
  const d1 = parseDDMMYYYY(text);
  const d2 = parseFechaEspanol(text);
  if (d1 && d2) return d1._idx <= d2._idx ? d1 : d2;
  return d1 || d2;
}

/* ============================================================
 * FECHA HUMANA (SOLO CREATE)
 * ========================================================== */

function resolveHumanDateForCreate(text, userTimeZone) {
  const t = text.toLowerCase();
  const now = nowInTimeZone(userTimeZone);

  const mk = (d) => ({
    yyyy: d.getFullYear(),
    mm: d.getMonth() + 1,
    dd: d.getDate(),
  });

  if (/\b(hoy|ahora)\b/.test(t)) return mk(now);

  if (/\b(pasado\s+mañana)\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return mk(d);
  }

  if (/\b(mañana)\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return mk(d);
  }

  const weekday = t.match(
    /\b(este\s+)?(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/
  );

  if (weekday) {
    const map = {
      domingo: 0,
      lunes: 1,
      martes: 2,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
    };

    const target = map[weekday[2]];
    const d = new Date(now);

    while (d.getDay() !== target) d.setDate(d.getDate() + 1);
    return mk(d);
  }

  return null;
}

/* ============================================================
 * HORA (ANCLADA Y HUMANA)
 * ========================================================== */

function parseHHMM(token) {
  const m = String(token || "").match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  let min = m[2] ? Number(m[2]) : 0;
  const ap = (m[3] || "").toLowerCase();

  if (min < 0 || min > 59) return null;

  if (ap) {
    if (ap === "pm" && hh !== 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
  }

  if (hh < 0 || hh > 23) return null;

  return { hh, min };
}

function findAnchoredTimeToken(text) {
  const t = String(text || "");

  const patterns = [
    /\b(?:a\s+las?|hora|hrs?|h)\s+(\d{1,2})\s+y\s+(\d{2})\b/i,
    /\b(?:a\s+las?|hora|hrs?|h)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\b(?:a\s+las?|hora|hrs?|h)\s+(\d{1,2})(?!\d)\b/i,
    /\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const idx = m.index ?? 0;
      if (!looksLikeLegalNumberContext(t, idx)) {
        return m[2] ? `${m[1]}:${m[2]}` : m[1].includes(":") ? m[1] : `${m[1]}:00`;
      }
    }
  }

  return null;
}

/* ============================================================
 * ISO BUILDER
 * ========================================================== */

function buildISO({ yyyy, mm, dd, hh, min }, offset) {
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}T${pad2(hh)}:${pad2(min)}:00${offset}`;
}

/* ============================================================
 * CREATE – Draft de Evento
 * ========================================================== */

export function extractAgendaDraftFromText(
  text,
  { usuarioId, expedienteId, userTimeZone = "America/Lima", tzOffset = "-05:00" } = {}
) {
  const t = safeStr(text);
  if (!t) return null;

  let d = pickDate(t);
  const timeToken = findAnchoredTimeToken(t);
  if (!timeToken) return null;

  if (!d) {
    d = resolveHumanDateForCreate(t, userTimeZone);
    if (!d) return null;
  }

  const tm = parseHHMM(timeToken);
  if (!tm) return null;

  const lower = t.toLowerCase();

  let title = "Evento";
  if (/\baudienci/.test(lower)) title = "Audiencia";
  else if (/\bconciliaci[oó]n\b/.test(lower)) title = "Conciliación";
  else if (/\bvencim|\bplazo\b/.test(lower)) title = "Vencimiento / Plazo";
  else if (/\breuni[oó]n\b/.test(lower)) title = "Reunión";
  else if (/\bcita\b/.test(lower)) title = "Cita";

  const startISO = buildISO({ ...d, ...tm }, tzOffset);

  let endH = tm.hh;
  let endM = tm.min + 60;
  if (endM >= 60) {
    endH += Math.floor(endM / 60);
    endM %= 60;
  }
  if (endH >= 24) {
    endH = 23;
    endM = 59;
  }

  const endISO = buildISO({ ...d, hh: endH, min: endM }, tzOffset);

  return {
    title,
    startISO,
    endISO,
    description: "",
    confidence: "high",
    usuarioId: usuarioId || null,
    expedienteId: expedienteId || null,
    userTimeZone,
  };
}

/* ============================================================
 * QUERY – Día exacto
 * ========================================================== */

export function extractDayISOFromText(text = "") {
  const d = pickDate(safeStr(text, 8000));
  if (!d) return null;
  return `${d.yyyy}-${pad2(d.mm)}-${pad2(d.dd)}`;
}

/* ============================================================
 * QUERY – Próxima semana
 * ========================================================== */

export function extractNextWeekRange(text = "", userTimeZone = "UTC") {
  const t = safeStr(text, 8000).toLowerCase();
  if (!/\b(pr[oó]xima semana|siguiente semana|semana que viene)\b/.test(t)) return null;

  const now = nowInTimeZone(userTimeZone);
  const start = new Date(now);
  start.setDate(start.getDate() + (8 - start.getDay()));

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDayISO: extractDayISOFromText(start.toISOString()),
    endDayISO: extractDayISOFromText(end.toISOString()),
    label: "próxima semana",
  };
}

/* ============================================================
 * QUERY – Offset humano
 * ========================================================== */

export function extractOffsetRange(text = "", userTimeZone = "UTC") {
  const t = safeStr(text, 8000).toLowerCase();
  const m = t.match(/\b(en|dentro de)\s+(\d{1,3})\s+(d[ií]as?|semanas?)\b/);
  if (!m) return null;

  const amount = Number(m[2]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const now = nowInTimeZone(userTimeZone);
  const d = new Date(now);
  d.setDate(d.getDate() + (m[3].startsWith("sem") ? amount * 7 : amount));

  const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  return { startDayISO: iso, endDayISO: iso, label: "offset" };
}

/* ============================================================
 * QUERY – Períodos humanos
 * ========================================================== */

export function extractPeriodFromText(text = "", now = new Date()) {
  const t = safeStr(text, 8000).toLowerCase();

  const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  if (/\b(hoy)\b/.test(t)) return { startDayISO: today, endDayISO: today };
  if (/\b(mañana)\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return { startDayISO: iso, endDayISO: iso };
  }

  return null;
}

/* ============================================================
 * QUERY – Rango explícito
 * ========================================================== */

export function extractRangeFromText(text = "") {
  const t = safeStr(text, 8000);

  const m = t.match(/\bdel?\s+(\d{1,2})\s+al?\s+(\d{1,2})\b/i);
  if (!m) return null;

  const base = pickDate(t);
  if (!base) return null;

  const d1 = clamp(Number(m[1]), 1, 31);
  const d2 = clamp(Number(m[2]), 1, 31);

  return {
    startDayISO: `${base.yyyy}-${pad2(base.mm)}-${pad2(Math.min(d1, d2))}`,
    endDayISO: `${base.yyyy}-${pad2(base.mm)}-${pad2(Math.max(d1, d2))}`,
  };
}
