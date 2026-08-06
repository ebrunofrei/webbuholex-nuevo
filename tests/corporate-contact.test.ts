import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import { rentalHousingContract } from "@/data/template-catalog";
import { buildWhatsAppUrl } from "@/lib/contact-links";

describe("correo corporativo y seguridad pública", () => {
  it("centraliza el único correo corporativo autorizado", () => {
    expect(siteConfig.contact.email).toBe("eduardo@buholex.com");
    expect(siteConfig.privacyContact).toBe("eduardo@buholex.com");
    expect(siteConfig.complaintsContact).toBe("eduardo@buholex.com");
  });

  it("centraliza el WhatsApp Business corporativo autorizado", () => {
    expect(siteConfig.contact.phone).toBe("+51 922 038 147");
    expect(siteConfig.contact.whatsapp.display).toBe("+51 922 038 147");
    expect(siteConfig.contact.whatsapp.e164).toBe("51922038147");
    expect(siteConfig.contact.whatsapp.owner).toBe("EMCCON");
    expect(buildWhatsAppUrl()).toContain("https://wa.me/51922038147?text=");
  });

  it("no incorpora datos bancarios, descargas, pagos o proveedores ficticios", () => {
    const files = ["components/public-header.tsx", "components/auth-header.tsx", "components/portal/legal-transparency-panel.tsx", "components/workspace/workspace-header.tsx", "components/workspace/workspace-placeholder.tsx", "app/espacio/page.tsx", "app/iniciar-sesion/page.tsx", "middleware.ts"];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/cuenta corriente|\bCCI\b|tarjeta|IBAN|SWIFT|Banco de Crédito|OAuth|magic link|Clerk|Auth0|Supabase|Firebase|\bQR\b|Calendly|Messenger/i);
    expect(source).not.toMatch(/\bdownload\s*=|checkout|pasarela|payment/i);
  });

  it("mantiene BL-LEG-CON-001 fuera de publicación", () => {
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
    expect(rentalHousingContract.publicationAuthorization.authorized).toBe(false);
  });
});
