import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { LegalTransparencyPanel } from "@/components/portal/legal-transparency-panel";
import ContactPage from "@/app/contacto/page";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("correcciones institucionales de la fase 10.F", () => {
  it("renderiza un único footer en dos niveles con tipografía legible", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
    expect(container.querySelector(".footer-main")).toBeInTheDocument();
    expect(container.querySelector(".footer-lower")).toBeInTheDocument();
    expect(screen.getByText("Libro de Reclamaciones")).toBeInTheDocument();
    expect(screen.getByText("Se habilitará antes del inicio de la atención comercial.")).toBeInTheDocument();
  });

  it("organiza la información empresarial del diálogo con etiquetas semánticas", () => {
    render(<LegalTransparencyPanel open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Transparencia y marco legal" })).toBeInTheDocument();
    expect(screen.getByText("Correo corporativo")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp Business corporativo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "eduardo@buholex.com" })).toHaveAttribute("href", "mailto:eduardo@buholex.com");
  });

  it("protege el correo del corte arbitrario", () => {
    const { container } = render(<ContactPage />);
    expect(screen.getByRole("link", { name: "eduardo@buholex.com" })).toHaveClass("contact-email");
    expect(container.textContent).toContain("eduardo@buholex.com");
    expect(read("app/globals.css")).not.toContain("word-break: break-all");
  });

  it("no oculta el indicador de desarrollo mediante estilos del producto", () => {
    const styles = `${read("app/globals.css")}\n${read("components/portal/dual-portal.module.css")}`;
    expect(styles).not.toMatch(/nextjs|dev-tools|dev-indicator/i);
  });
});
