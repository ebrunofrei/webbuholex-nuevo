import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFrame } from "@/components/site-frame";
import AssistantPage from "@/app/asistente/page";

const routeState = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => routeState.pathname }));

describe("Fase 12.B.6 - Separación de los tres Shells", () => {
  it("Gateway / no monta PublicHeader ni IntelligentPreviewHeader", () => {
    routeState.pathname = "/";
    render(<SiteFrame><p>Gateway</p></SiteFrame>);
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación del espacio inteligente" })).not.toBeInTheDocument();
  });

  it("PublicShell se mantiene para rutas públicas", () => {
    routeState.pathname = "/explorar/";
    render(<SiteFrame><p>Explorar</p></SiteFrame>);
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // SiteFooter
  });

  it("IntelligentPreviewShell aísla /asistente de la zona pública", () => {
    routeState.pathname = "/asistente/";
    render(<SiteFrame><p>Intelligent Preview</p></SiteFrame>);

    // Monta el header inteligente
    expect(screen.getByRole("navigation", { name: "Navegación del espacio inteligente" })).toBeInTheDocument();

    // No monta el header público ni franja institucional
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Información pública · Acceso libre/)).not.toBeInTheDocument();
  });

  it("IntelligentPreviewHeader contiene navegación mínima y estado de preparación", () => {
    routeState.pathname = "/asistente/";
    const { container } = render(<SiteFrame><p>Content</p></SiteFrame>);

    expect(container.textContent).toMatch(/BúhoLex/);
    expect(container.textContent).toMatch(/Espacio inteligente/);
    expect(container.textContent).toMatch(/En preparación/);

    expect(screen.getByRole("link", { name: /Inicio/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Información pública/i })).toHaveAttribute("href", expect.stringMatching(/^\/explorar\/?$/));
    expect(screen.getByRole("link", { name: /Solicitar evaluación/i })).toHaveAttribute("href", expect.stringMatching(/^\/consulta-profesional\/?$/));
  });

  it("La vista de Asistente no depende visualmente del shell público", () => {
    const { container } = render(<AssistantPage />);

    expect(container.textContent).toMatch(/Asistente Jurídico BúhoLex/);
    expect(container.textContent).toMatch(/En preparación/);
    expect(container.textContent).toMatch(/No sustituye evaluación profesional/);
  });
});
