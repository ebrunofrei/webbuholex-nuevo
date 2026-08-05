import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeFiles = [
  "app/page.tsx",
  "app/explorar/page.tsx",
  "app/iniciar-sesion/page.tsx",
  "app/espacio/page.tsx",
  "app/servicios/page.tsx",
  "app/asistente/page.tsx",
  "app/consulta-profesional/page.tsx",
  "app/plantillas/page.tsx",
  "app/plantillas/legales/page.tsx",
  "app/plantillas/empresariales/page.tsx",
  "app/plantillas/contables/page.tsx",
  "app/plantillas/legales/contrato-arrendamiento-vivienda/page.tsx",
  "app/editorial/plantillas/BL-LEG-CON-001/page.tsx",
  "app/icon.svg",
  "app/jurisprudencia/page.tsx",
  "app/codigos/page.tsx",
  "app/biblioteca/page.tsx",
  "app/blog/page.tsx",
  "app/nosotros/page.tsx",
  "app/contacto/page.tsx",
  "app/privacidad/page.tsx",
  "app/terminos/page.tsx",
  "app/libro-de-reclamaciones/page.tsx",
  "app/not-found.tsx",
] as const;

describe("mapa de rutas aprobado", () => {
  it.each(routeFiles)("incluye %s", (routeFile) => {
    expect(existsSync(join(process.cwd(), routeFile))).toBe(true);
  });

  it("resuelve favicon.ico hacia el icono de marca", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain('source: "/favicon.ico"');
    expect(config).toContain('destination: "/icon.svg"');
  });
});
