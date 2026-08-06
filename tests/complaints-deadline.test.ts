import { describe, it, expect } from "vitest";
import { calculatePreliminaryComplaintDeadline } from "@/lib/complaints";

describe("Complaints Deadline", () => {
  it("calcula fecha límite sin cruzar fines de semana", () => {
    const params = {
      submittedAt: "2026-08-03T10:00:00Z", // Lunes
      businessDays: 3,
      timeZone: "America/Lima",
      holidays: [],
    };
    // +3 días hábiles -> Jueves 06
    expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-06");
  });

  it("salta el fin de semana", () => {
    const params = {
      submittedAt: "2026-08-06T10:00:00Z", // Jueves
      businessDays: 2,
      timeZone: "America/Lima",
      holidays: [],
    };
    // +2 días hábiles -> Jueves(+1=Viernes, +2=Lunes)
    expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-10");
  });

  it("salta feriados explícitos", () => {
    const params = {
      submittedAt: "2026-08-28T10:00:00Z", // Viernes
      businessDays: 2,
      timeZone: "America/Lima",
      holidays: ["2026-08-31"], // Lunes feriado
    };
    // Viernes -> Martes 01
    expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-09-02");
  });

  it("salta una secuencia de feriados y fin de semana", () => {
    const params = {
      submittedAt: "2026-12-30T10:00:00Z", // Miércoles
      businessDays: 3,
      timeZone: "America/Lima",
      holidays: ["2026-12-31", "2027-01-01"], // Jueves y Viernes feriados
    };
    // Fin de semana (2 y 3). -> Lunes 4 (+1), Martes 5 (+2), Miércoles 6 (+3)
    expect(calculatePreliminaryComplaintDeadline(params)).toBe("2027-01-06");
  });

  it("calcula correctamente la fecha inicial considerando la zona horaria", () => {
    const params = {
      submittedAt: "2026-08-04T03:00:00Z", // Lunes 3 de Agosto 22:00 en Lima (UTC-5)
      businessDays: 3,
      timeZone: "America/Lima",
      holidays: [],
    };
    // El inicio es Lunes 3 de Agosto. +3 días hábiles -> Jueves 06 de Agosto
    expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-06");
  });

  it("falla con fecha inválida", () => {
    expect(() => calculatePreliminaryComplaintDeadline({
      submittedAt: "fecha-invalida",
      businessDays: 15,
      timeZone: "America/Lima",
      holidays: [],
    })).toThrow();
  });

  describe("Requisitos Adicionales de Deadline", () => {
    it("empieza en sábado (salta fin de semana)", () => {
      const params = {
        submittedAt: "2026-08-08T10:00:00Z", // Sábado
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: [],
      };
      // +1 día hábil desde el Sábado -> Lunes 10
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-10");
    });

    it("empieza en domingo (salta fin de semana)", () => {
      const params = {
        submittedAt: "2026-08-09T10:00:00Z", // Domingo
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: [],
      };
      // +1 día hábil desde el Domingo -> Lunes 10
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-10");
    });

    it("salta feriado siguiente", () => {
      const params = {
        submittedAt: "2026-08-03T10:00:00Z", // Lunes 03
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: ["2026-08-04"], // Martes 04 feriado
      };
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-05"); // Miércoles 05
    });

    it("ignora feriados duplicados sin alterar deadline", () => {
      const params = {
        submittedAt: "2026-08-03T10:00:00Z", // Lunes 03
        businessDays: 2,
        timeZone: "America/Lima",
        holidays: ["2026-08-04", "2026-08-04"],
      };
      // Martes 04 feriado. +2 hábiles -> Jueves 06
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-06");
    });

    it("calcula correctamente año bisiesto (2028-02-29 aceptado)", () => {
      const params = {
        submittedAt: "2028-02-28T10:00:00Z", // Lunes 28 Feb (Bisiesto)
        businessDays: 2,
        timeZone: "America/Lima",
        holidays: ["2028-02-29"],
      };
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2028-03-02");
    });

    it("asegura que el arreglo de feriados original no es mutado", () => {
      const originalHolidays = Object.freeze(["2026-08-04"]);
      const params = {
        submittedAt: "2026-08-03T10:00:00Z",
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: originalHolidays,
      };
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-05");
    });

    it("convierte 2026-08-05T04:30:00Z a fecha civil 2026-08-04 en Lima", () => {
      const params = {
        submittedAt: "2026-08-05T04:30:00Z",
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: [],
      };
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-05");
    });

    it("convierte 2026-08-05T05:30:00Z a fecha civil 2026-08-05 en Lima", () => {
      const params = {
        submittedAt: "2026-08-05T05:30:00Z",
        businessDays: 1,
        timeZone: "America/Lima",
        holidays: [],
      };
      expect(calculatePreliminaryComplaintDeadline(params)).toBe("2026-08-06");
    });
  });

  describe("Validaciones Estrictas", () => {
    const validParams = {
      submittedAt: "2026-08-03T10:00:00Z",
      businessDays: 1,
      timeZone: "America/Lima",
      holidays: [],
    };

    it("Zona America/Lima aceptada", () => {
      expect(() => calculatePreliminaryComplaintDeadline(validParams)).not.toThrow();
    });

    it("Zona UTC rechazada", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, timeZone: "UTC" })).toThrow();
    });

    it("Zona Asia/Tokyo rechazada", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, timeZone: "Asia/Tokyo" })).toThrow();
    });

    it("Zona America/Bogota rechazada", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, timeZone: "America/Bogota" })).toThrow();
    });

    it("Zona vacía rechazada", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, timeZone: "" })).toThrow();
    });

    it("Feriado válido aceptado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-08-04"] })).not.toThrow();
    });

    it("2026-02-29 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-02-29"] })).toThrow();
    });

    it("2026-02-30 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-02-30"] })).toThrow();
    });

    it("2026-04-31 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-04-31"] })).toThrow();
    });

    it("2026-13-01 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-13-01"] })).toThrow();
    });

    it("2026-00-01 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-00-01"] })).toThrow();
    });

    it("2026-2-05 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-2-05"] })).toThrow();
    });

    it("2026/02/05 rechazado", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026/02/05"] })).toThrow();
    });

    it("Cadena vacía rechazada", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: [""] })).toThrow();
    });

    it("Arreglo con un elemento válido y otro inválido falla por completo", () => {
      expect(() => calculatePreliminaryComplaintDeadline({ ...validParams, holidays: ["2026-08-04", "2026-02-30"] })).toThrow();
    });
  });
});
