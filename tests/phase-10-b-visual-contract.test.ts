import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { futureAnalyticsEvents } from "@/data/analytics-events";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("contrato visual y público de Fase 10.B", () => {
  it("reserva una columna al búho y mantiene los CTA dentro del flujo", () => {
    const css = read("components/portal/dual-portal.module.css");
    const component = read("components/portal/dual-portal.tsx");
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) clamp\(/);
    expect(css).toMatch(/\.choiceAction[^}]*margin-top/s);
    expect(css).not.toMatch(/\.owl\s*\{[^}]*position:\s*absolute/s);
    expect(component).toContain("Conocimiento jurídico abierto");
    expect(component).toContain("Trabajo jurídico personalizado");
    expect(component).not.toMatch(/styles\.index|>01<|>02</);
  });

  it("contiene reglas móviles sin altura fija ni superposición del búho", () => {
    const css = read("components/portal/dual-portal.module.css");
    expect(css).toMatch(/@media \(max-width: 820px\)/);
    expect(css).toMatch(/\.owl\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*2/s);
    expect(css).toMatch(/\.choice\s*\{[^}]*min-height:\s*auto/s);
  });

  it("retira lenguaje interno del panel y del asistente público", () => {
    const panel = read("components/portal/legal-transparency-panel.tsx");
    const assistant = read("app/asistente/page.tsx") + read("components/assistant-interface.tsx");
    expect(panel).not.toMatch(/pendiente de validación pública|formulario no habilitado|canal pendiente|todavía no activada/i);
    expect(panel).toContain("Algunas funciones comerciales y canales de atención se habilitarán antes del lanzamiento público.");
    expect(assistant).not.toMatch(/sin OpenAI|proveedor|estado de integración/i);
    expect(assistant).toContain("ASISTENCIA Y ORIENTACIÓN");
    expect(assistant).toContain("Asistente Jurídico BúhoLex");
    expect(assistant).not.toMatch(/LitisBot/i);
  });

  it("no expone fuentes doctrinarias, archivos privados o resultados ficticios", () => {
    const publicUi =
      read("components/jurisprudence/jurisprudence-public-page.tsx") +
      read("components/jurisprudence/jurisprudence-assisted-demo.tsx");

    expect(publicUi).not.toMatch(
      /ISBN|autor del libro|título comercial del libro|product-assets|sha256|CONTRATO-CESION|Casación\s+N|EXP\.\s*\d/i,
    );

    expect(publicUi).toContain("JurisprudencePublicSearch");
    expect(publicUi).not.toContain("FixturePublicSearchGateway");
    expect(publicUi).not.toContain("fictitiousItem");
    expect(publicUi).not.toContain("resultadosFicticios");
    expect(publicUi).not.toMatch(
      /toPublicJurisprudenceSearchItem|jurisprudenceRecordSchema/,
    );
  });

  it("modela analítica sin enviar consultas jurídicas", () => {
    const requestedNames = ["jurisprudence_search", "jurisprudence_result_open", "official_source_open", "jurisprudence_filter_apply", "jurisprudence_assistant_intent", "quick_read_intent", "compare_intent", "applicability_intent", "signup_from_jurisprudence", "premium_analysis_intent"] as const;
    const jurisprudenceEvents = futureAnalyticsEvents.filter((event) => requestedNames.some((name) => name === event.name));
    expect(jurisprudenceEvents).toHaveLength(10);
    expect(jurisprudenceEvents.every((event) => event.status === "modeled_only" && !event.sendsToThirdParties && !event.permitsLegalQueryContent)).toBe(true);
  });
});
