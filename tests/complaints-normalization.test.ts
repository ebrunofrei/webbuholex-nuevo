import { describe, it, expect } from "vitest";
import {
  normalizeComplaintText,
  normalizePersonName,
  normalizeEmail,
  normalizePhone,
  normalizeDocumentNumber,
  normalizeLineBreaks,
  removeDisallowedControlCharacters,
} from "@/lib/complaints";

describe("Complaints Normalization", () => {
  it("normaliza nombres quitando espacios extra", () => {
    expect(normalizePersonName("  Juan   Pérez  ")).toBe("Juan Pérez");
  });

  it("normaliza el email a minúsculas y quita espacios", () => {
    expect(normalizeEmail("  JuAn@ExAmPlE.com  ")).toBe("juan@example.com");
  });

  it("normaliza teléfonos manteniendo el formato internacional", () => {
    expect(normalizePhone(" +51 (922) 038 - 147 ")).toBe("+51(922)038-147");
  });

  it("normaliza documento quitando espacios y pasando a mayúsculas", () => {
    expect(normalizeDocumentNumber(" a b c 1 2 3 x ")).toBe("ABC123X");
  });

  it("normaliza saltos de línea de Windows a Linux", () => {
    expect(normalizeLineBreaks("Hola\r\nMundo\r")).toBe("Hola\nMundo\n");
  });

  it("elimina caracteres de control no permitidos", () => {
    const malicious = "Texto\x00\x08Oculto\x1B";
    expect(removeDisallowedControlCharacters(malicious)).toBe("TextoOculto");
  });

  it("mantiene saltos de línea y tabulaciones", () => {
    const text = "Línea 1\n\tLínea 2";
    expect(removeDisallowedControlCharacters(text)).toBe(text);
  });

  it("normaliza texto completo preservando tildes y formato", () => {
    const input = "  \x00El reclamo \r\n es sobre un pingüino cañero.  ";
    expect(normalizeComplaintText(input)).toBe("El reclamo \n es sobre un pingüino cañero.");
  });
});
