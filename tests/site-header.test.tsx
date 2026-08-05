import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site-header";

vi.mock("next/navigation", () => ({ usePathname: () => "/servicios/asesoria-juridica/" }));

describe("navegación pública", () => {
  it("marca Servicios como ruta activa y no expone rutas ocultas", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Plantillas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Biblioteca" })).not.toBeInTheDocument();
  });

  it("abre, cierra y expone correctamente el menú móvil", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
  });
});
