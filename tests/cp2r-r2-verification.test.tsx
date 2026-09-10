import { describe, it, expect, vi } from "vitest";
import { publicServices } from "../data/services";
import { render } from "@testing-library/react";
import { ServiceDetail } from "../components/services/service-detail";
import { PublicHeader } from "../components/public-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("CP-2R-R2 Validations", () => {
  it("A. from cannot allow immediate payment", () => {
    for (const service of publicServices) {
      if (service.pricingMode === "from") {
        expect(service.allowsImmediatePayment).toBe(false);
      }
      if (service.subOffers) {
        for (const offer of service.subOffers) {
          if (offer.pricingMode === "from") {
            expect(offer.allowsImmediatePayment).toBe(false);
          }
        }
      }
    }
  });

  it("B. BúhoDoc subOffers preserve internal structured prices", () => {
    const buhodoc = publicServices.find((s) => s.id === "SRV-BUHODOC-001");
    expect(buhodoc).toBeDefined();
    const auto = buhodoc?.subOffers?.find((o) => o.title.includes("Apelación de Auto"));
    const sentencia = buhodoc?.subOffers?.find((o) => o.title.includes("Apelación de Sentencia"));
    const casacion = buhodoc?.subOffers?.find((o) => o.title.includes("Recurso de Casación"));

    expect(auto?.price).toBe(250);
    expect(auto?.pricingMode).toBe("from");

    expect(sentencia?.price).toBe(500);
    expect(sentencia?.pricingMode).toBe("from");

    expect(casacion?.price).toBe(2000);
    expect(casacion?.pricingMode).toBe("from");
  });

  it("C & D. public BúhoDoc UI does NOT render numeric prices", () => {
    const buhodoc = publicServices.find((s) => s.id === "SRV-BUHODOC-001")!;
    const { container } = render(<ServiceDetail service={buhodoc} />);

    expect(container.textContent).not.toMatch(/250/);
    expect(container.textContent).not.toMatch(/500/);
    expect(container.textContent).not.toMatch(/2000/);
    expect(container.textContent).not.toMatch(/2,000/);

    // Check D: "Honorarios según evaluación"
    expect(container.textContent).toMatch(/Según evaluación y complejidad/);
  });

  it("E. Casation remains senior, evaluation required, no immediate payment", () => {
    const buhodoc = publicServices.find((s) => s.id === "SRV-BUHODOC-001");
    const casacion = buhodoc?.subOffers?.find((o) => o.title.includes("Recurso de Casación"));

    expect(casacion?.professionalLevel).toBe("senior");
    expect(casacion?.requiresEvaluation).toBe(true);
    expect(casacion?.allowsImmediatePayment).toBe(false);
  });

  it("F. Appeals remain evaluation required, no immediate payment", () => {
    const buhodoc = publicServices.find((s) => s.id === "SRV-BUHODOC-001");
    const auto = buhodoc?.subOffers?.find((o) => o.title.includes("Apelación de Auto"));
    const sentencia = buhodoc?.subOffers?.find((o) => o.title.includes("Apelación de Sentencia"));

    expect(auto?.requiresEvaluation).toBe(true);
    expect(auto?.allowsImmediatePayment).toBe(false);
    expect(sentencia?.requiresEvaluation).toBe(true);
    expect(sentencia?.allowsImmediatePayment).toBe(false);
  });

  it("G & H. Global public descriptor is exactly Plataforma de servicios profesionales de EMCCON", () => {
    const { container } = render(<PublicHeader />);
    expect(container.textContent).toMatch(/Plataforma de servicios profesionales de EMCCON/);
    expect(container.textContent).not.toMatch(/Plataforma jurídica de EMCCON/);
  });

  it("I. Service count remains unchanged (11)", () => {
    expect(publicServices.length).toBe(11);
  });
});
