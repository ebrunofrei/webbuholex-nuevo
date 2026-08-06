import { describe, it, expect } from "vitest";
import { formatComplaintSheetNumber, createComplaintPrivateToken } from "@/lib/complaints";

describe("Complaints Identifiers", () => {
  describe("Número de Hoja", () => {
    it("formatea correctamente con padding de ceros", () => {
      expect(formatComplaintSheetNumber({ year: 2026, sequence: 1 })).toBe("LR-2026-000001");
      expect(formatComplaintSheetNumber({ year: 2026, sequence: 25 })).toBe("LR-2026-000025");
      expect(formatComplaintSheetNumber({ year: 2026, sequence: 999999 })).toBe("LR-2026-999999");
    });

    it("no trunca números de secuencia mayores a 6 dígitos", () => {
      expect(formatComplaintSheetNumber({ year: 2026, sequence: 1000000 })).toBe("LR-2026-1000000");
    });

    it("rechaza secuencias inválidas (cero o negativo)", () => {
      expect(() => formatComplaintSheetNumber({ year: 2026, sequence: 0 })).toThrow();
      expect(() => formatComplaintSheetNumber({ year: 2026, sequence: -5 })).toThrow();
      expect(() => formatComplaintSheetNumber({ year: 2026, sequence: 1.5 })).toThrow();
    });

    it("rechaza años inválidos", () => {
      expect(() => formatComplaintSheetNumber({ year: 1999, sequence: 1 })).toThrow();
      expect(() => formatComplaintSheetNumber({ year: 2101, sequence: 1 })).toThrow();
      expect(() => formatComplaintSheetNumber({ year: 2026.5, sequence: 1 })).toThrow();
    });
  });

  describe("Token Privado", () => {
    it("genera un token de 12 caracteres usando inyección pura (sin Math.random)", () => {
      const bytes = new Uint8Array([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]);
      const token = createComplaintPrivateToken(bytes);
      expect(token).toHaveLength(12);
    });

    it("asegura que se excluyen caracteres ambiguos si usa el alfabeto configurado", () => {
      const bytes = new Uint8Array(100).fill(0);
      const token = createComplaintPrivateToken(bytes);
      expect(token).toHaveLength(12);
      expect(token).not.toMatch(/[0OIl]/);
    });

    it("lanza error si no hay suficientes bytes para generar el token", () => {
      const bytes = new Uint8Array(5);
      expect(() => createComplaintPrivateToken(bytes)).toThrow("Entropía insuficiente para generar el token");
    });

    describe("Rejection Sampling", () => {
      it("acepta byte 0", () => {
        const bytes = new Uint8Array(12).fill(0);
        const token = createComplaintPrivateToken(bytes);
        expect(token).toHaveLength(12);
      });

      it("acepta byte 231", () => {
        const bytes = new Uint8Array(12).fill(231);
        const token = createComplaintPrivateToken(bytes);
        expect(token).toHaveLength(12);
      });

      it("descarta byte 232 y 255 (arroja error si solo quedan menos de 12)", () => {
        const bytes = new Uint8Array(12);
        bytes.fill(232, 0, 6);
        bytes.fill(255, 6, 12);
        expect(() => createComplaintPrivateToken(bytes)).toThrow("Entropía insuficiente para generar el token");
      });

      it("usa bytes válidos posteriores a los descartados (232, 255)", () => {
        const bytes = new Uint8Array(14);
        bytes[0] = 232;
        bytes[1] = 255;
        bytes.fill(0, 2, 14); // 12 ceros
        const token = createComplaintPrivateToken(bytes);
        expect(token).toHaveLength(12);
      });

      it("lanza error de entropía si todos los bytes son >= 232", () => {
        const bytes = new Uint8Array(100).fill(232);
        expect(() => createComplaintPrivateToken(bytes)).toThrow("Entropía insuficiente para generar el token");
      });

      it("no devuelve token parcial", () => {
        const bytes = new Uint8Array(11).fill(0);
        expect(() => createComplaintPrivateToken(bytes)).toThrow();
      });

      it("misma entrada produce mismo token (determinismo)", () => {
        const bytes = new Uint8Array(12).fill(150);
        const token1 = createComplaintPrivateToken(bytes);
        const token2 = createComplaintPrivateToken(bytes);
        expect(token1).toBe(token2);
      });

      it("solo produce caracteres del alfabeto configurado", () => {
        const bytes = new Uint8Array(12).fill(100);
        const token = createComplaintPrivateToken(bytes);
        expect(token).toMatch(/^[1-9A-HJ-NP-Za-km-z]{12}$/); // Base58 characters
      });
    });
  });
});
