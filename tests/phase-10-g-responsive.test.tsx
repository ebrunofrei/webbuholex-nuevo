import fs from "node:fs";
import path from "node:path";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DualPortal } from "@/components/portal/dual-portal";
import { LegalTransparencyPanel } from "@/components/portal/legal-transparency-panel";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import { rentalHousingContract } from "@/data/template-catalog";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const routeState = vi.hoisted(() => ({ pathname: "/explorar" }));

vi.mock("next/navigation", () => ({ usePathname: () => routeState.pathname }));

describe("auditoría responsive de la fase 10.G", () => {
  it("utiliza el PNG institucional original con canal alfa real", () => {
    const file = fs.readFileSync(path.join(root, "public/brand/buho-institucional.png"));
    expect(file.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(file.readUInt32BE(16)).toBe(783);
    expect(file.readUInt32BE(20)).toBe(1057);
    expect(file[25]).toBe(6); // PNG truecolor con canal alfa.
  });

  it("separa semánticamente el halo de la imagen y conserva un solo h1", () => {
    const { container } = render(<DualPortal />);
    const image = screen.getByRole("img", { name: "Búho institucional de BúhoLex" });
    expect(image.getAttribute("src")).toContain("buho-institucional.png");
    expect(image.parentElement?.className).toMatch(/owlHalo/);
    expect(image.className).toMatch(/owlImage/);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("apila el portal sin recortar el halo y respeta movimiento reducido", () => {
    const css = read("components/portal/dual-portal.module.css");
    expect(css).toMatch(/\.owlHalo\s*\{[^}]*overflow:\s*visible/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*820px\)[\s\S]*\.choices\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/\.publicChoice\s*\{[^}]*grid-row:\s*1/s);
    expect(css).toMatch(/\.owl\s*\{[^}]*grid-row:\s*2/s);
    expect(css).toMatch(/\.intelligentChoice\s*\{[^}]*grid-row:\s*3/s);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.owlHalo,\s*\.owlImage\s*\{[^}]*animation:\s*none/s);
  });

  it("no usa 100vw ni valores end incompatibles en los estilos críticos", () => {
    const files = [
      "app/globals.css",
      "components/portal/dual-portal.module.css",
      "components/services/services.module.css",
      "components/jurisprudence/jurisprudence.module.css",
    ];
    const css = files.map(read).join("\n");
    expect(css).not.toMatch(/\b(?:width|min-width|max-width):\s*100vw\b/);
    expect(css).not.toMatch(/(?:align-items|justify-content|place-content|align-content|justify-self|align-self):\s*end\b/);
    expect(css).not.toContain("word-break: break-all");
  });

  it("ofrece un menú público móvil accesible y sin rutas privadas", () => {
    const { container } = render(<PublicHeader />);
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "public-navigation");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector('a[href^="/app"]')).toBeNull();
  });

  it("mantiene accesibles el panel legal y la estructura empresarial", () => {
    render(<LegalTransparencyPanel open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Transparencia y marco legal" })).toHaveAttribute("aria-modal", "true");
    expect(document.querySelectorAll("dl dt").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Cerrar transparencia y marco legal" })).toBeInTheDocument();
  });

  it("renderiza un único footer y conserva los contactos centralizados", () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
    expect(screen.getByRole("link", { name: siteConfig.contact.email })).toHaveAttribute("href", `mailto:${siteConfig.contact.email}`);
    expect(screen.getByRole("link", { name: siteConfig.contact.whatsapp.display })).toBeInTheDocument();
    expect(siteConfig.contact.whatsapp.e164).toBe("51922038147");
  });

  it("preserva el estado editorial y comercial del producto real", () => {
    const metadata = JSON.parse(read("product-assets/BL-LEG-CON-001/metadata.json").replace(/^\uFEFF/, "")) as {
      published: boolean;
      visibility: string;
      price: number | null;
      currency: string | null;
      license: { status: string };
    };
    expect(metadata.published).toBe(false);
    expect(metadata.visibility).toBe("editorial_preview");
    expect(metadata.price).toBeNull();
    expect(metadata.currency).toBeNull();
    expect(metadata.license.status).toBe("pending");
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
    expect(rentalHousingContract.versionHistory.some((entry) => entry.publicationAuthorizedBy !== null)).toBe(false);
  });
});
