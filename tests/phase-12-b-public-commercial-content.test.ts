import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Contenido Público Comercial Fase 12.B", () => {
  it("cumple con las restricciones de enrutamiento comercial", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const nav = readFileSync("data/navigation.ts", "utf8");

    expect(page).toContain("CommercialHome");
    expect(page).not.toContain("DualPortal");

    expect(nav).toContain("hidden");
    expect(nav).toContain("/codigos/");
    expect(nav).toContain("/biblioteca/");
    expect(nav).toContain("/plantillas/");
  });
});
