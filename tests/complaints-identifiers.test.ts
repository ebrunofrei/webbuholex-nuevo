import { describe, it, expect, vi } from "vitest";
import { formatComplaintSheetNumber, createComplaintPrivateToken, RandomBytesSource } from "@/lib/complaints/complaint-identifiers";

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
    it("longitud exacta 32 y solo caracteres Base58", () => {
      const source = () => new Uint8Array(40).fill(0);
      const token = createComplaintPrivateToken(source);
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32}$/);
    });

    it("determinismo con fuente inyectada", () => {
      const source = () => new Uint8Array(40).fill(150);
      expect(createComplaintPrivateToken(source)).toBe(createComplaintPrivateToken(source));
    });

    it("múltiples bloques cuando existen bytes rechazados", () => {
      let calls = 0;
      const source = (size: number) => {
        calls++;
        const bytes = new Uint8Array(size);
        if (calls === 1) {
          bytes.fill(255); // rejected
          bytes[0] = 0; // 1 accepted
        } else {
          bytes.fill(0); // all accepted
        }
        return bytes;
      };
      const token = createComplaintPrivateToken(source);
      expect(token).toHaveLength(32);
      expect(calls).toBeGreaterThan(1);
    });

    it("rechazo de bytes desde acceptanceLimit", () => {
      const source = () => {
        const bytes = new Uint8Array(40);
        bytes.fill(232); // 232 is acceptanceLimit (4 * 58)
        return bytes;
      };
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("ausencia de sesgo por módulo (usa bytes válidos posteriores a los descartados)", () => {
      const source = () => {
        const bytes = new Uint8Array(40);
        bytes[0] = 232;
        bytes[1] = 255;
        bytes.fill(0, 2, 40);
        return bytes;
      };
      const token = createComplaintPrivateToken(source);
      expect(token).toHaveLength(32);
    });

    it("fuente recibe 40 y es invocada más de una vez cuando es necesario", () => {
      const mockSource = vi.fn().mockImplementation((size: number) => {
        expect(size).toBe(40);
        const bytes = new Uint8Array(40);
        bytes.fill(255); // all rejected
        bytes[0] = 0; // 1 accepted per call
        return bytes;
      });
      const token = createComplaintPrivateToken(mockSource);
      expect(token).toHaveLength(32);
      expect(mockSource).toHaveBeenCalledTimes(32);
    });

    it("fuente no es función", () => {
      expect(() => createComplaintPrivateToken(null as unknown as RandomBytesSource)).toThrow("complaint_token_generation_failed");
    });

    it("fuente lanza", () => {
      const source = () => { throw new Error("Oops"); };
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("retorno no Uint8Array", () => {
      const source = () => [0] as unknown as Uint8Array;
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("retorno corto", () => {
      const source = () => new Uint8Array(39);
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("retorno largo, según política congelada", () => {
      const source = () => new Uint8Array(41);
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("agotamiento de 100 intentos", () => {
      const source = () => new Uint8Array(40).fill(255); // always rejected
      expect(() => createComplaintPrivateToken(source)).toThrow("complaint_token_generation_failed");
    });

    it("error opaco, sin contenido de bytes", () => {
      try {
        createComplaintPrivateToken(() => new Uint8Array(39));
        expect.fail("Should throw");
      } catch (e: unknown) {
        if (e instanceof Error) {
          expect(e.message).toBe("complaint_token_generation_failed");
        }
        expect(e).not.toHaveProperty("cause");
        expect((e as Error).message).not.toContain("39");
      }
    });

    it("no usa Math.random (inyectado)", () => {
      const mathRandomSpy = vi.spyOn(Math, "random");
      createComplaintPrivateToken(() => new Uint8Array(40).fill(0));
      expect(mathRandomSpy).not.toHaveBeenCalled();
      mathRandomSpy.mockRestore();
    });

    it("no muta el bloque", () => {
      const block = new Uint8Array(40).fill(0);
      const clone = new Uint8Array(40).fill(0);
      createComplaintPrivateToken(() => block);
      expect(block).toEqual(clone);
    });

    it("dos fuentes distintas pueden producir tokens distintos", () => {
      const source1 = () => new Uint8Array(40).fill(0);
      const source2 = () => new Uint8Array(40).fill(1);
      expect(createComplaintPrivateToken(source1)).not.toBe(createComplaintPrivateToken(source2));
    });

    it("compatibilidad con HMAC mínimo de 32 caracteres", () => {
      const token = createComplaintPrivateToken(() => new Uint8Array(40).fill(0));
      expect(token.length).toBeGreaterThanOrEqual(32);
    });
  });
});
