export function calculatePreliminaryComplaintDeadline(params: {
  submittedAt: string;
  businessDays: number;
  timeZone: string; // Used conceptually. Pure function relies on UTC for date math, pretending it's local.
  holidays: readonly string[]; // ISO YYYY-MM-DD
}): string {
  if (params.timeZone !== "America/Lima") {
    throw new Error("Solo se permite la zona horaria America/Lima");
  }

  let year: number;
  let month: number;
  let day: number;

  const dateOnlyMatch = params.submittedAt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch && dateOnlyMatch[1] && dateOnlyMatch[2] && dateOnlyMatch[3]) {
    year = parseInt(dateOnlyMatch[1], 10);
    month = parseInt(dateOnlyMatch[2], 10) - 1;
    day = parseInt(dateOnlyMatch[3], 10);

    const testDate = new Date(Date.UTC(year, month, day));
    if (
      testDate.getUTCFullYear() !== year ||
      testDate.getUTCMonth() !== month ||
      testDate.getUTCDate() !== day
    ) {
      throw new Error("Fecha de envío inexistente");
    }
  } else {
    const submitDate = new Date(params.submittedAt);
    if (isNaN(submitDate.getTime())) {
      throw new Error("Fecha de envío inválida");
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: params.timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    const parts = formatter.formatToParts(submitDate);
    const yearStr = parts.find(p => p.type === "year")?.value;
    const monthStr = parts.find(p => p.type === "month")?.value;
    const dayStr = parts.find(p => p.type === "day")?.value;

    if (!yearStr || !monthStr || !dayStr) {
      throw new Error("Fecha de envío inválida");
    }

    year = parseInt(yearStr, 10);
    month = parseInt(monthStr, 10) - 1;
    day = parseInt(dayStr, 10);
  }

  const validatedHolidays = new Set<string>();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const h of params.holidays) {
    if (!dateRegex.test(h)) {
      throw new Error(`Formato de feriado inválido: ${h}`);
    }
    const [y, m, d] = h.split("-").map(Number);

    const dateObj = new Date(Date.UTC(y!, m! - 1, d!));
    if (
      dateObj.getUTCFullYear() !== y ||
      dateObj.getUTCMonth() !== m! - 1 ||
      dateObj.getUTCDate() !== d
    ) {
      throw new Error(`Fecha de feriado inexistente: ${h}`);
    }
    validatedHolidays.add(h);
  }

  // Work with UTC to avoid local timezone issues of the runner
  let daysToAdd = params.businessDays;
  const currentDate = new Date(Date.UTC(year, month, day));

  while (daysToAdd > 0) {
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);

    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const isoDate = currentDate.toISOString().split("T")[0]!;
    const isHoliday = validatedHolidays.has(isoDate);

    if (!isWeekend && !isHoliday) {
      daysToAdd--;
    }
  }

  return currentDate.toISOString().split("T")[0]!;
}
