import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicExplore } from "@/components/explore/public-explore";
import { ServiceDetail } from "@/components/services/service-detail";
import { getPublicServiceBySlug, publicServices } from "@/data/services";
import { siteConfig } from "@/lib/site-config";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const webService = getPublicServiceBySlug("diseno-desarrollo-paginas-web-profesionales");

describe("fase 10.H: servicio web, responsive y consola", () => {
  it("registra SRV-WEB-001 como el octavo servicio tipado", () => {
    expect(publicServices).toHaveLength(8);
    expect(webService).toMatchObject({
      id: "SRV-WEB-001",
      slug: "diseno-desarrollo-paginas-web-profesionales",
      category: "digital",
      price: null,
      currency: null,
      responsible: null,
      allowsImmediatePayment: false,
      requiresEvaluation: true,
      published: false,
    });
  });

  it("renderiza una ficha única y dirige a evaluación con slug validado", () => {
    expect(webService).toBeDefined();
    const { container } = render(<ServiceDetail service={webService!} />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "¿A quién está dirigido?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Alcance posible" })).toBeInTheDocument();
    expect(container.querySelector('a[href="/consulta-profesional?service=diseno-desarrollo-paginas-web-profesionales"]')).toBeInTheDocument();
    expect(container.querySelector('[download], [href^="/app"], [href*="checkout"], [href*="compra"]')).toBeNull();
  });

  it("no formula promesas comerciales garantizadas ni incorpora QR o banca", () => {
    expect(webService).toBeDefined();
    const claims = `${webService!.summary} ${webService!.description} ${webService!.scope.join(" ")} ${webService!.potentialDeliverables?.join(" ") ?? ""}`;
    expect(claims).not.toMatch(/primer lugar en Google|ventas garantizadas|clientes garantizados|seguridad absoluta|hosting gratuito|dominio gratuito/i);
    const source = `${read("data/services.ts")}\n${read("components/services/service-detail.tsx")}`;
    expect(source).not.toMatch(/código QR|cuenta corriente|CCI:|número de cuenta/i);
  });

  it("reconoce los servicios digitales en el directorio público", () => {
    render(<PublicExplore />);
    expect(screen.getByText("Servicios jurídicos, empresariales, administrativos, técnicos y digitales.")).toBeInTheDocument();
  });

  it("sanea valores flex start y evita 100vw en superficies críticas", () => {
    const css = `${read("components/portal/dual-portal.module.css")}\n${read("components/services/services.module.css")}`;
    expect(css).not.toMatch(/(?:align-items|justify-content|align-self):\s*start\b/);
    expect(css).not.toMatch(/\b(?:width|min-width|max-width):\s*100vw\b/);
  });

  it("mantiene centralizados los canales institucionales", () => {
    expect(siteConfig.contact.email).toBe("eduardo@buholex.com");
    expect(siteConfig.contact.whatsapp.display).toBe("922 038 147");
    expect(siteConfig.contact.whatsapp.e164).toBe("51922038147");
  });
});
