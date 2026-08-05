import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommercialHome } from "@/components/home/commercial-home";

describe("CommercialHome - Arquitectura de Compuerta 12.B.3", () => {
  it("identidad, único H1 y estructura de compuerta", () => {
    const { container } = render(<CommercialHome />);

    // 1. Un único H1
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/plataforma jurídica interactiva/i);
    expect(h1s[0]).not.toHaveTextContent(/BÚHOLEX/i);

    // No hay áreas de intervención ni cómo trabajamos
    const content = container.textContent || "";
    expect(content).not.toMatch(/Áreas de intervención/i);
    expect(content).not.toMatch(/Cómo trabajamos/i);
    expect(content).not.toMatch(/Proceso de atención/i);
  });

  it("exactamente dos accesos y destinos correctos", () => {
    render(<CommercialHome />);

    // 3. Exactamente dos accesos principales
    const mainLinks = screen.getAllByRole("link");
    expect(mainLinks).toHaveLength(2);

    // 4. “Explorar BúhoLex” enlaza a /explorar/
    const exploreLink = screen.getByRole("link", { name: /Explorar/i });
    expect(exploreLink).toHaveAttribute("href", expect.stringMatching(/^\/explorar\/?$/));

    // 5. “Espacio inteligente” enlaza a /asistente/
    const aiLink = screen.getByRole("link", { name: /Espacio IA legal/i });
    expect(aiLink).toHaveAttribute("href", expect.stringMatching(/^\/asistente\/?$/));
  });

  it("ausencia de CTA comerciales adicionales y rutas prohibidas", () => {
    const { container } = render(<CommercialHome />);

    // 6. No existe enlace a /servicios/ como acceso principal del home
    expect(container.querySelector('a[href="/servicios/"]')).toBeNull();
    expect(container.querySelector('a[href="/servicios"]')).toBeNull();

    // 7. No existe enlace a /consulta-profesional/ dentro de CommercialHome
    expect(container.querySelector('a[href*="/consulta-profesional"]')).toBeNull();

    // 8. No existe CTA de WhatsApp dentro de CommercialHome
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();

    // 9. No existe enlace a /iniciar-sesion/
    expect(container.querySelector('a[href*="/iniciar-sesion"]')).toBeNull();

    // 10. No existe enlace a /app/
    expect(container.querySelector('a[href*="/app"]')).toBeNull();
  });

  it("búho decorativo, accesibilidad y estado “en desarrollo”", () => {
    const { container } = render(<CommercialHome />);

    // 2. Búho visible, 18. Búho no es enlace
    const owlImage = container.querySelector('img[src*="buho-institucional"]');
    expect(owlImage).toBeInTheDocument();
    expect(owlImage).toHaveAttribute("alt", ""); // decorativo
    expect(owlImage?.closest("a")).toBeNull();

    // 17. Espacio inteligente en desarrollo
    const content = container.textContent || "";
    expect(content).toMatch(/desarrollo|preparación/i);

    // 19. Slogan presente sin BúhoLex
    const slogan = container.querySelector('p[class*="owlSlogan"]');
    expect(slogan).toHaveTextContent(/Derecho, tecnología y criterio profesional en un solo espacio/i);
    expect(slogan).not.toHaveTextContent(/BúhoLex/i);

    // 20. Ausencia de LitisBot
    expect(content).not.toMatch(/LitisBot/i);
  });

  it("ausencia de contenido trasladado, footer duplicado y enlaces legales internos", () => {
    const { container } = render(<CommercialHome />);
    const content = container.textContent || "";

    // 11. No hay catálogo de servicios
    expect(content).not.toMatch(/Asesoría jurídica/i);

    // 15. No aparecen preguntas frecuentes
    expect(content).not.toMatch(/Preguntas frecuentes/i);

    // 16. No se duplican enlaces legales
    expect(content).not.toMatch(/Política de Privacidad/i);
    expect(content).not.toMatch(/Términos y Condiciones/i);
  });

  it("garantiza recomposición responsive, breakpoints y accesibilidad", async () => {
    // Leemos el archivo CSS para verificar la existencia de las reglas requeridas
    const fs = await import("node:fs");
    const css = fs.readFileSync("components/home/commercial-home.module.css", "utf8");

    // Desktop grid
    expect(css).toMatch(/grid-template-columns:\s*1fr 1fr/);
    expect(css).toMatch(/width:\s*100%/);

    // Tablet breakpoint (1199px o similar)
    expect(css).toMatch(/@media \(max-width: 1199px\)/);

    // Móvil breakpoint (767px o similar)
    expect(css).toMatch(/@media \(max-width: 767px\)/);

    // Accesibilidad y táctil
    expect(css).toMatch(/min-height:\s*48px/); // Tamaño táctil
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);

    // Verificación de botones centrados y flechas absolutas
    expect(css).toMatch(/\.choiceAction\s*{[^}]*justify-content:\s*center/);
    expect(css).toMatch(/\.choiceAction\s*i\s*{[^}]*position:\s*absolute/);

    // El DOM mantiene el orden semántico correcto
    const { container } = render(<CommercialHome />);
    const main = container.querySelector('main');
    const children = Array.from(main?.children || []);

    expect(children.length).toBe(2);
    expect(children[0]!.tagName).toBe("HEADER");

    const dualContainer = children[1];
    const dualChildren = Array.from(dualContainer?.children || []);
    expect(dualChildren[0]!.className).toMatch(/publicChoice/);
    expect(dualChildren[1]!.className).toMatch(/owl/);
    expect(dualChildren[2]!.className).toMatch(/intelligentChoice/);
  });
});
