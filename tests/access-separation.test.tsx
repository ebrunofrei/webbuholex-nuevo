import React from "react";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthHeader } from "@/components/auth-header";
import { PublicHeader } from "@/components/public-header";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { publicNavigation, workspaceNavigation } from "@/data/navigation";

const routeState = vi.hoisted(() => ({ pathname: "/explorar" }));
vi.mock("next/navigation", () => ({ usePathname: () => routeState.pathname }));

describe("separación de shells y menús", () => {
  beforeEach(() => { routeState.pathname = "/explorar"; });

  it("PublicHeader contiene navegación pública y ninguna ruta /app", () => {
    const { container } = render(<PublicHeader />);
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "INGRESAR" })).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="/app"]')).toBeNull();
    expect(publicNavigation.every((item) => item.accessLevel === "public")).toBe(true);
  });

  it("AuthHeader es mínimo y no incorpora el menú público completo", () => {
    render(<AuthHeader />);
    expect(screen.getByRole("navigation", { name: "Navegación de acceso" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación pública" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a información pública" })).toHaveAttribute("href", "/");
  });

  it("WorkspaceShell usa navegación privada sin usuario, plan o historial ficticios", () => {
    routeState.pathname = "/app";
    const { container } = render(<WorkspaceShell navigationItems={workspaceNavigation}><p>Contenido aislado de prueba</p></WorkspaceShell>);
    expect(screen.getByRole("navigation", { name: "Navegación del espacio privado" })).toBeInTheDocument();
    expect(container.querySelector('a[href="/app/proyectos"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/explorar"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Bienvenido,|plan actual|créditos disponibles|historial reciente|avatar/i);
    expect(workspaceNavigation.every((item) => item.accessLevel === "authenticated" || item.accessLevel === "premium")).toBe(true);
  });

  it("/espacio es una explicación pública sin herramientas privadas", () => {
    const source = readFileSync("app/espacio/page.tsx", "utf8");
    expect(source).toContain("Presentación pública");
    expect(source).not.toMatch(/WorkspaceShell|WorkspaceHeader|WorkspaceNavigation/);
  });
});
