import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ServicesPage from "@/app/servicios/page";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl } from "@/lib/contact-links";

describe("ServicesPage - Contenido Comercial 12.B.2", () => {
  it("contiene los bloques comerciales trasladados y los CTAs validados", () => {
    const { container } = render(<ServicesPage />);

    // 1. ServiceCatalog sigue montado
    expect(screen.getByText(/Catálogo de servicios/i)).toBeInTheDocument();

    // 2. Aparece “Cómo trabajamos”
    expect(screen.getByText(/Cómo trabajamos/i)).toBeInTheDocument();

    // 3. Aparece “Proceso de atención”
    expect(screen.getByText(/Proceso de atención/i)).toBeInTheDocument();

    // 4. Aparecen preguntas frecuentes comerciales
    expect(screen.getByText(/Preguntas frecuentes comerciales/i)).toBeInTheDocument();

    // 5. No se duplica la grilla resumida del home
    expect(container.textContent).not.toMatch(/Áreas de intervención/i);

    // 6. Existe CTA a /consulta-profesional/
    const formLinks = screen.getAllByRole("link", { name: /Ir al formulario de evaluación/i });
    expect(formLinks.length).toBeGreaterThan(0);
    expect(formLinks[0]).toHaveAttribute("href", expect.stringContaining("/consulta-profesional"));

    // 7. Existe CTA a WhatsApp
    const waLinks = screen.getAllByRole("link", { name: new RegExp(siteConfig.contact.whatsapp.display.replace("+", "\\+"), "i") });
    expect(waLinks.length).toBeGreaterThan(0);
    expect(waLinks[0]).toHaveAttribute("href", buildWhatsAppUrl());

    // 8. No se inventan precios
    expect(container.textContent).not.toMatch(/\$\d+/);
    expect(container.textContent).not.toMatch(/S\/\s*\d+/);

    // 9. No se habilita pago automático
    expect(container.textContent).not.toMatch(/Pagar ahora/i);
    expect(container.textContent).not.toMatch(/Comprar/i);
  });
});
