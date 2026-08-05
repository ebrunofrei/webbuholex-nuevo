import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { templateCatalog } from "@/data/template-catalog";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8").replace(/^\uFEFF/, "");

describe("sistema visual institucional de la fase 10.E", () => {
  it("centraliza la paleta pública, privada y semántica", () => {
    const css = read("app/globals.css");
    for (const token of [
      "--bl-white: #ffffff",
      "--bl-black: #171717",
      "--bl-red: #b83a24",
      "--bl-blue: #0757c8",
      "--bl-blue-deep: #063b83",
      "--bl-success: #16835f",
      "--bl-warning: #b7791f",
      "--bl-error: #b42318",
    ]) expect(css).toContain(token);
  });

  it("separa cromáticamente el portal público y el espacio inteligente", () => {
    const css = read("components/portal/dual-portal.module.css");
    expect(css).toContain(".publicChoice { color: var(--ink); background: var(--bl-white);");
    expect(css).toContain("var(--bl-blue-deep)");
    expect(css).toContain("outline-color: var(--bl-red-interactive)");
    expect(css).toContain("outline-color: var(--bl-blue-interactive)");
  });

  it("mantiene fondos blancos en los directorios públicos principales", () => {
    const styles = [
      read("components/explore/public-explore.module.css"),
      read("components/services/services.module.css"),
      read("components/jurisprudence/jurisprudence.module.css"),
    ].join("\n");
    expect(styles.match(/background: var\(--bl-white\)/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("conserva el producto real fuera de publicación y comercio", () => {
    const product = templateCatalog.find((item) => item.code === "BL-LEG-CON-001");
    const metadata = JSON.parse(read("product-assets/BL-LEG-CON-001/metadata.json")) as Record<string, unknown>;
    expect(product).toBeDefined();
    expect(product).toMatchObject({
      availabilityStatus: "editorial_preview",
      price: null,
      currency: null,
      licenseStatus: "pending",
    });
    expect(product?.publicationAuthorization.authorized).toBe(false);
    expect(metadata).toMatchObject({ published: false, visibility: "editorial_preview", price: null, currency: null });
  });

  it("no introduce entradas Vite ni Tailwind heredado", () => {
    const css = read("app/globals.css");
    expect(css).not.toMatch(/@tailwind\s+(base|components|utilities)/);
    expect(fs.existsSync(path.join(root, "main.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(root, "app", "main.tsx"))).toBe(false);
  });
});
