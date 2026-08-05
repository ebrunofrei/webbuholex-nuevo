import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFrame } from "@/components/site-frame";

const routeState = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => routeState.pathname }));

describe("marco global por zona", () => {
  it("retira menú y footer del portal raíz", () => {
    routeState.pathname = "/";
    render(<SiteFrame><p>Portal</p></SiteFrame>);
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("mantiene navegación pública completa en explorar y no duplica inicio", () => {
    routeState.pathname = "/explorar/";
    render(<SiteFrame><p>Explorar</p></SiteFrame>);
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    // Rutas vigentes
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Servicios" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Nosotros" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Consulta profesional" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Contacto" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Jurisprudencia" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Asistente/i }).length).toBeGreaterThan(0);

    // Rutas ocultas
    expect(screen.queryByRole("link", { name: "Plantillas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Biblioteca" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Legislación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Códigos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "INGRESAR" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Explorar" })).not.toBeInTheDocument();
  });

  it.each(["/jurisprudencia"])("usa PublicHeader en %s", (pathname) => {
    routeState.pathname = pathname;
    render(<SiteFrame><p>Recurso público</p></SiteFrame>);
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación del espacio privado" })).not.toBeInTheDocument();
  });

  it("usa IntelligentPreviewHeader en /asistente", () => {
    routeState.pathname = "/asistente";
    render(<SiteFrame><p>Intelligent Preview</p></SiteFrame>);
    expect(screen.getByRole("navigation", { name: "Navegación del espacio inteligente" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
  });

  it("usa cabecera mínima en iniciar sesión", () => {
    routeState.pathname = "/iniciar-sesion";
    render(<SiteFrame><p>Acceso</p></SiteFrame>);
    expect(screen.getByRole("navigation", { name: "Navegación de acceso" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("no inyecta shell público dentro de /app", () => {
    routeState.pathname = "/app/asistente";
    render(<SiteFrame><p>Ruta protegida</p></SiteFrame>);
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
