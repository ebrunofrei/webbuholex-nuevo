/**
 * Calendario canónico de feriados nacionales no laborables en el Perú
 * aplicables al cómputo de plazos en días hábiles (zona horaria America/Lima)
 * para el Libro de Reclamaciones Virtual de BúhoLex.
 *
 * Base legal oficial vigente:
 * 1. Decreto Legislativo N.° 713 (Consolidación de descansos remunerados), art. 6:
 *    - 1 de enero: Año Nuevo
 *    - Jueves Santo y Viernes Santo (movibles según cómputo de Pascua)
 *    - 1 de mayo: Día del Trabajo
 *    - 29 de junio: San Pedro y San Pablo
 *    - 28 y 29 de julio: Fiestas Patrias
 *    - 30 de agosto: Santa Rosa de Lima
 *    - 8 de octubre: Combate de Angamos
 *    - 1 de noviembre: Todos los Santos
 *    - 8 de diciembre: Inmaculada Concepción
 *    - 25 de diciembre: Navidad
 * 2. Ley N.° 31396 (publicada el 24/12/2021):
 *    - 9 de diciembre: Batalla de Ayacucho
 * 3. Ley N.° 31530 (publicada el 26/07/2022):
 *    - 6 de agosto: Batalla de Junín
 * 4. Ley N.° 31788 (publicada el 15/06/2023):
 *    - 7 de junio: Batalla de Arica y Día de la Bandera
 * 5. Ley N.° 31822 (publicada el 08/07/2023):
 *    - 23 de julio: Día de la Fuerza Aérea del Perú
 */

export interface PeruHoliday {
  readonly date: string; // YYYY-MM-DD
  readonly name: string;
  readonly legalBasis: string;
}

/**
 * Computus: algoritmo gregoriano anónimo (Meeus/Jones/Butcher) para el domingo de Pascua.
 */
export function calculateEasterSunday(year: number): { month: number; day: number } {
  if (!Number.isInteger(year) || year < 1583 || year > 4099) {
    throw new Error(`Año fuera de rango para cómputo de Pascua: ${year}`);
  }
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Devuelve los 16 feriados nacionales de un año calendario dado en formato YYYY-MM-DD.
 */
export function getPeruNationalHolidays(year: number): readonly PeruHoliday[] {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Año inválido para feriados: ${year}`);
  }

  const { month: easterMonth, day: easterDay } = calculateEasterSunday(year);

  // Jueves Santo: Domingo de Pascua - 3 días (calculado en UTC)
  const juevesDate = new Date(Date.UTC(year, easterMonth - 1, easterDay - 3));
  const juevesSanto = `${year}-${padZero(juevesDate.getUTCMonth() + 1)}-${padZero(juevesDate.getUTCDate())}`;

  // Viernes Santo: Domingo de Pascua - 2 días (calculado en UTC)
  const viernesDate = new Date(Date.UTC(year, easterMonth - 1, easterDay - 2));
  const viernesSanto = `${year}-${padZero(viernesDate.getUTCMonth() + 1)}-${padZero(viernesDate.getUTCDate())}`;

  const holidays: PeruHoliday[] = [
    { date: `${year}-01-01`, name: "Año Nuevo", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: juevesSanto, name: "Jueves Santo", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: viernesSanto, name: "Viernes Santo", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-05-01`, name: "Día del Trabajo", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-06-07`, name: "Batalla de Arica y Día de la Bandera", legalBasis: "Ley N.° 31788" },
    { date: `${year}-06-29`, name: "San Pedro y San Pablo", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-07-23`, name: "Día de la Fuerza Aérea del Perú", legalBasis: "Ley N.° 31822" },
    { date: `${year}-07-28`, name: "Fiestas Patrias", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-07-29`, name: "Fiestas Patrias", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-08-06`, name: "Batalla de Junín", legalBasis: "Ley N.° 31530" },
    { date: `${year}-08-30`, name: "Santa Rosa de Lima", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-10-08`, name: "Combate de Angamos", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-11-01`, name: "Día de Todos los Santos", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-12-08`, name: "Inmaculada Concepción", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
    { date: `${year}-12-09`, name: "Batalla de Ayacucho", legalBasis: "Ley N.° 31396" },
    { date: `${year}-12-25`, name: "Navidad", legalBasis: "Decreto Legislativo N.° 713, art. 6" },
  ];

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}

export function getPeruNationalHolidayDates(year: number): readonly string[] {
  return getPeruNationalHolidays(year).map((h) => h.date);
}

/**
 * Devuelve un conjunto de feriados para una ventana operativa centrada en el año especificado
 * (incluyendo el año anterior y posterior para soportar cambios de año y consultas limítrofes).
 */
export function getOperationalHolidays(referenceYear?: number): ReadonlySet<string> {
  const year = referenceYear ?? new Date().getFullYear();
  const prevYearDates = getPeruNationalHolidayDates(year - 1);
  const currentYearDates = getPeruNationalHolidayDates(year);
  const nextYearDates = getPeruNationalHolidayDates(year + 1);
  return new Set<string>([...prevYearDates, ...currentYearDates, ...nextYearDates]);
}
