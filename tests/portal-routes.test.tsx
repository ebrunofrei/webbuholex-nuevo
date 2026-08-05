import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicExplore } from "@/components/explore/public-explore";
import { FutureAccessPage } from "@/components/portal/future-access-page";
import { accessBoundaries } from "@/data/access-boundaries";

describe("zona pública y rutas preparatorias", () => {
  it("ofrece navegación pública completa sin login", () => {
    render(<PublicExplore />);
    for (const destination of ["Jurisprudencia", "Manuales y guías", "Legislación", "Plantillas y productos", "Servicios", "Herramientas públicas", "Artículos", "Institución", "Contacto"]) {
      expect(screen.getByRole("link", { name: new RegExp(destination, "i") })).toBeInTheDocument();
    }
  });

  it("la preparación de login no contiene formulario", () => {
    const { container } = render(<FutureAccessPage eyebrow="ACCESO" title="Acceso futuro" description="Cuenta futura" status="No habilitado" boundaries={accessBoundaries} mode="login" />);
    expect(container.querySelector("form, input[type='password'], input[type='email']")).toBeNull();
    expect(screen.getByRole("link", { name: "VOLVER A INFORMACIÓN PÚBLICA" })).toHaveAttribute("href", "/explorar");
  });

  it("el espacio no simula cuenta, plan, saldo, historial o compras", () => {
    const { container } = render(<FutureAccessPage eyebrow="ESPACIO" title="Espacio inteligente" description="Capacidades futuras" status="Arquitectura en preparación" boundaries={accessBoundaries} mode="space" />);
    expect(container.textContent).not.toMatch(/Bienvenido,|Mi saldo|Plan actual|Historial reciente|Compra realizada/i);
    expect(container.querySelector("form, [download], [href*='compra']")).toBeNull();
  });
});
