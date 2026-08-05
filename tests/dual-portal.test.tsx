import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualPortal } from "@/components/portal/dual-portal";

describe("portal dual", () => {
  it("muestra únicamente los dos accesos principales con destinos distintos", () => {
    render(<DualPortal />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: /INFORMACIÓN PÚBLICA/i })).toHaveAttribute("href", "/explorar");
    expect(screen.getByRole("link", { name: /ESPACIO VIRTUAL INTELIGENTE/i })).toHaveAttribute("href", "/iniciar-sesion");
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Servicios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Plantillas" })).not.toBeInTheDocument();
  });

  it("abre y cierra el panel legal con Escape y devuelve el foco", () => {
    render(<DualPortal />);
    const opener = screen.getByRole("button", { name: "Transparencia y marco legal" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Transparencia y marco legal" });
    expect(dialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Cerrar transparencia y marco legal" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("mantiene el foco dentro del diálogo", () => {
    render(<DualPortal />);
    fireEvent.click(screen.getByRole("button", { name: "Transparencia y marco legal" }));
    const close = screen.getByRole("button", { name: "Cerrar transparencia y marco legal" });
    const contact = screen.getByRole("link", { name: "Atención al consumidor e información comercial" });
    contact.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(contact).toHaveFocus();
  });

  it("no simula el Libro de Reclamaciones ni expone datos privados", () => {
    const { container } = render(<DualPortal />);
    fireEvent.click(screen.getByRole("button", { name: "Transparencia y marco legal" }));
    expect(screen.getByText("Se habilitará antes del inicio de la atención comercial.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Libro de Reclamaciones/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/DNI|firma|CONTRATO-CESION|product-assets|sha256|cuenta bancaria/i);
    expect(container.querySelector("[download], [href*='compra']")).toBeNull();
  });
});
