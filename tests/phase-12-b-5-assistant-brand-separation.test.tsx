import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import AssistantPage from "@/app/asistente/page";
import { CommercialHome } from "@/components/home/commercial-home";

describe("Fase 12.B.5 - Separación de Marca de Asistente", () => {
  it("/asistente contiene Asistente Jurídico BúhoLex y no LitisBot", () => {
    const { container } = render(<AssistantPage />);
    const content = container.textContent || "";

    // 1. /asistente contiene “Asistente Jurídico BúhoLex”
    expect(content).toMatch(/Asistente Jurídico BúhoLex/i);

    // 2. /asistente no contiene “LitisBot”
    expect(content).not.toMatch(/LitisBot/i);

    // El Espacio inteligente pertenece a BúhoLex
    expect(content).toMatch(/orientación inicial.*canales profesionales de BúhoLex/i);
  });

  it("CommercialHome no contiene LitisBot", () => {
    const { container } = render(<CommercialHome />);
    const content = container.textContent || "";

    // 3. CommercialHome no contiene “LitisBot”
    expect(content).not.toMatch(/LitisBot/i);
  });

  it("No existen simulaciones de chat ni endpoints activos", () => {
    const { container } = render(<AssistantPage />);

    // No se simula procesamiento de documentos ni chat (solo texto informativo)
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();

    // 5. No existe enlace a litisbot.com
    expect(container.querySelector('a[href*="litisbot.com"]')).toBeNull();
  });
});
