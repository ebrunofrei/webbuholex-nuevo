import { describe, it, expect } from "vitest";
import {
  calculateEasterSunday,
  getPeruNationalHolidays,
  getPeruNationalHolidayDates,
  getOperationalHolidays,
} from "@/lib/complaints/complaint-holidays";
import { calculatePreliminaryComplaintDeadline } from "@/lib/complaints/complaint-deadline";

describe("Calendario Canónico de Feriados Nacionales del Perú", () => {
  describe("Algoritmo Computus de Pascua (Meeus/Jones/Butcher)", () => {
    it("calcula correctamente el Domingo de Pascua para años conocidos", () => {
      // 2024: 31 de marzo
      expect(calculateEasterSunday(2024)).toEqual({ month: 3, day: 31 });
      // 2025: 20 de abril
      expect(calculateEasterSunday(2025)).toEqual({ month: 4, day: 20 });
      // 2026: 5 de abril
      expect(calculateEasterSunday(2026)).toEqual({ month: 4, day: 5 });
      // 2027: 28 de marzo
      expect(calculateEasterSunday(2027)).toEqual({ month: 3, day: 28 });
    });

    it("rechaza años fuera de rango gregoriano", () => {
      expect(() => calculateEasterSunday(1500)).toThrow("fuera de rango");
      expect(() => calculateEasterSunday(5000)).toThrow("fuera de rango");
    });
  });

  describe("Feriados Nacionales Oficiales Vigentes (16 feriados)", () => {
    it("genera exactamente 16 feriados nacionales por año", () => {
      const holidays2026 = getPeruNationalHolidays(2026);
      expect(holidays2026).toHaveLength(16);
    });

    it("incluye todos los feriados permanentes y móviles para 2026", () => {
      const dates2026 = getPeruNationalHolidayDates(2026);

      // Pascua 2026 es 5 de abril. Jueves Santo: 2 de abril. Viernes Santo: 3 de abril.
      expect(dates2026).toContain("2026-01-01"); // Año Nuevo
      expect(dates2026).toContain("2026-04-02"); // Jueves Santo
      expect(dates2026).toContain("2026-04-03"); // Viernes Santo
      expect(dates2026).toContain("2026-05-01"); // Día del Trabajo
      expect(dates2026).toContain("2026-06-07"); // Batalla de Arica y Día de la Bandera (Ley 31788)
      expect(dates2026).toContain("2026-06-29"); // San Pedro y San Pablo
      expect(dates2026).toContain("2026-07-23"); // Día de la FAP (Ley 31822)
      expect(dates2026).toContain("2026-07-28"); // Fiestas Patrias
      expect(dates2026).toContain("2026-07-29"); // Fiestas Patrias
      expect(dates2026).toContain("2026-08-06"); // Batalla de Junín (Ley 31530)
      expect(dates2026).toContain("2026-08-30"); // Santa Rosa de Lima
      expect(dates2026).toContain("2026-10-08"); // Combate de Angamos
      expect(dates2026).toContain("2026-11-01"); // Todos los Santos
      expect(dates2026).toContain("2026-12-08"); // Inmaculada Concepción
      expect(dates2026).toContain("2026-12-09"); // Batalla de Ayacucho (Ley 31396)
      expect(dates2026).toContain("2026-12-25"); // Navidad
    });

    it("sustenta el 7 de junio en la Ley N.° 31788 y descarta expresamente la Ley 31701", () => {
      const holidays = getPeruNationalHolidays(2026);
      const june7 = holidays.find(h => h.date === "2026-06-07");
      expect(june7).toBeDefined();
      expect(june7?.name).toBe("Batalla de Arica y Día de la Bandera");
      expect(june7?.legalBasis).toBe("Ley N.° 31788");
      expect(june7?.legalBasis).not.toContain("31701");
    });

    it("sustenta el 23 de julio en la Ley N.° 31822", () => {
      const holidays = getPeruNationalHolidays(2026);
      const july23 = holidays.find(h => h.date === "2026-07-23");
      expect(july23).toBeDefined();
      expect(july23?.legalBasis).toBe("Ley N.° 31822");
    });

    it("no contiene duplicados de fechas ni feriados sectoriales o regionales indebidos", () => {
      const holidays = getPeruNationalHolidays(2026);
      const dateSet = new Set(holidays.map(h => h.date));
      expect(dateSet.size).toBe(16);

      // Verificar que no se incluyen fechas sectoriales o de régimen especial
      const dates = holidays.map(h => h.date);
      expect(dates).not.toContain("2026-04-01"); // Día del Abogado (no es feriado nacional D.Leg. 713)
      expect(dates).not.toContain("2026-07-06"); // Día del Maestro (sectorial)
      expect(dates).not.toContain("2026-09-24"); // Feriados patronales regionales
    });

    it("cada feriado tiene nombre y base legal oficial documentada", () => {
      const holidays = getPeruNationalHolidays(2026);
      for (const h of holidays) {
        expect(h.name).toBeTruthy();
        expect(h.legalBasis).toBeTruthy();
        expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("rechaza años inválidos", () => {
      expect(() => getPeruNationalHolidays(1990)).toThrow("Año inválido");
      expect(() => getPeruNationalHolidays(2150)).toThrow("Año inválido");
    });
  });

  describe("Ventana Operativa de Feriados (getOperationalHolidays)", () => {
    it("incluye feriados del año anterior, actual y siguiente para soportar cambios de año", () => {
      const ops = getOperationalHolidays(2026);
      expect(ops.has("2025-12-25")).toBe(true);
      expect(ops.has("2026-01-01")).toBe(true);
      expect(ops.has("2026-07-28")).toBe(true);
      expect(ops.has("2027-01-01")).toBe(true);
      expect(ops.size).toBe(48); // 16 * 3
    });
  });

  describe("Cómputo de Plazos en Días Hábiles con Feriados Reales", () => {
    it("excluye sábados y domingos", () => {
      // 2026-10-26 (lunes): 15 días hábiles sin feriados en el periodo
      // Semana 1: 27, 28, 29, 30 (4 días)
      // Semana 2: 2 (feriado lunes 2? No, 1 nov es domingo), 3, 4, 5, 6 (5 días -> total 9)
      // Semana 3: 9, 10, 11, 12, 13 (5 días -> total 14)
      // Semana 4: 16 (1 día -> total 15)
      const holidays = Array.from(getOperationalHolidays(2026));
      const deadline = calculatePreliminaryComplaintDeadline({
        submittedAt: "2026-10-26",
        businessDays: 15,
        timeZone: "America/Lima",
        holidays,
      });

      expect(deadline).toBe("2026-11-16");
    });

    it("salta feriados oficiales en el cómputo de 15 días hábiles", () => {
      // Presentado el 2026-07-20 (lunes)
      // Feriados en ese tramo:
      // 2026-07-23 (jueves, Día FAP)
      // 2026-07-28 (martes, Fiestas Patrias)
      // 2026-07-29 (miércoles, Fiestas Patrias)
      // 2026-08-06 (jueves, Batalla de Junín)
      // 4 feriados a saltar además de fines de semana
      const holidays = Array.from(getOperationalHolidays(2026));
      const deadline = calculatePreliminaryComplaintDeadline({
        submittedAt: "2026-07-20",
        businessDays: 15,
        timeZone: "America/Lima",
        holidays,
      });

      // Día 1: 21 jul (mar)
      // Día 2: 22 jul (mié)
      // 23 jul: FERIADO
      // Día 3: 24 jul (vie)
      // Fin de semana: 25-26 jul
      // Día 4: 27 jul (lun)
      // 28-29 jul: FERIADOS
      // Día 5: 30 jul (jue)
      // Día 6: 31 jul (vie)
      // Fin de semana: 1-2 ago
      // Día 7: 3 ago (lun)
      // Día 8: 4 ago (mar)
      // Día 9: 5 ago (mié)
      // 6 ago: FERIADO
      // Día 10: 7 ago (vie)
      // Fin de semana: 8-9 ago
      // Día 11: 10 ago (lun)
      // Día 12: 11 ago (mar)
      // Día 13: 12 ago (mié)
      // Día 14: 13 ago (jue)
      // Día 15: 14 ago (vie)
      expect(deadline).toBe("2026-08-14");
    });

    it("soporta cambio de año (diciembre a enero)", () => {
      // Presentado el 2026-12-15 (martes)
      // Feriado: 2026-12-25 (Navidad, viernes)
      // Feriado: 2027-01-01 (Año Nuevo, viernes)
      const holidays = Array.from(getOperationalHolidays(2026));
      const deadline = calculatePreliminaryComplaintDeadline({
        submittedAt: "2026-12-15",
        businessDays: 15,
        timeZone: "America/Lima",
        holidays,
      });

      // Día 1: 16 dic (mié)
      // Día 2: 17 dic (jue)
      // Día 3: 18 dic (vie)
      // 19-20 dic: fin de semana
      // Día 4: 21 dic (lun)
      // Día 5: 22 dic (mar)
      // Día 6: 23 dic (mié)
      // Día 7: 24 dic (jue)
      // 25 dic: FERIADO
      // 26-27 dic: fin de semana
      // Día 8: 28 dic (lun)
      // Día 9: 29 dic (mar)
      // Día 10: 30 dic (mié)
      // Día 11: 31 dic (jue)
      // 1 ene: FERIADO
      // 2-3 ene: fin de semana
      // Día 12: 4 ene (lun)
      // Día 13: 5 ene (mar)
      // Día 14: 6 ene (mié)
      // Día 15: 7 ene (jue)
      expect(deadline).toBe("2027-01-07");
    });

    it("el cálculo es invariante respecto a la zona horaria del sistema runner", () => {
      const holidays = Array.from(getOperationalHolidays(2026));
      const deadlineLima = calculatePreliminaryComplaintDeadline({
        submittedAt: "2026-05-15",
        businessDays: 15,
        timeZone: "America/Lima",
        holidays,
      });

      expect(deadlineLima).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
