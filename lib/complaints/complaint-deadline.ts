export function calculatePreliminaryComplaintDeadline(params: {
  submittedAt: string;
  businessDays: number;
  timeZone: string; // Used conceptually. Pure function relies on UTC for date math, pretending it's local.
  holidays: readonly string[]; // ISO YYYY-MM-DD
}): string {
  if (params.timeZone !== "America/Lima") {
    throw new Error("Solo se permite la zona horaria America/Lima");
  }

  const submitDate = new Date(params.submittedAt);
  if (isNaN(submitDate.getTime())) {
    throw new Error("Fecha de envío inválida");
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

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: params.timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = formatter.formatToParts(submitDate);
  const year = parseInt(parts.find(p => p.type === "year")!.value, 10);
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10) - 1;
  const day = parseInt(parts.find(p => p.type === "day")!.value, 10);

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
