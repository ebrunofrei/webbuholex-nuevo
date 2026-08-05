import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contrato visual y arquitectónico de Fase 10.D", () => {
  it("integra el activo institucional en un halo circular con dimensiones reservadas", () => {
    const portal = readFileSync("components/portal/dual-portal.tsx", "utf8");
    const styles = readFileSync("components/portal/dual-portal.module.css", "utf8");
    expect(portal).toContain('width={783} height={1057}');
    expect(portal).toContain('src="/brand/buho-institucional.png"');
    expect(styles).toMatch(/\.owlHalo\s*\{[^}]*aspect-ratio:\s*1/s);
    expect(styles).toMatch(/\.owlHalo\s*\{[^}]*border-radius:\s*50%/s);
    expect(styles).toContain("@keyframes owlEntrance");
    expect(styles).toContain("@keyframes owlIdle");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toMatch(/\.owlHalo,\s*\.owlImage\s*\{[^}]*animation:\s*none/s);
  });

  it("conserva Next App Router sin entradas heredadas", () => {
    for (const forbidden of ["main.jsx", "main.tsx", "App.jsx", "index.css", "src/pages"]) expect(existsSync(forbidden)).toBe(false);
    const packageSource = readFileSync("package.json", "utf8");
    expect(packageSource).not.toContain("react-router-dom");
  });
});
