import { describe, expect, it } from "vitest";
import { buildConsultationMessage, buildConsultationWhatsAppUrl, buildConsultationEmailUrl } from "@/lib/contact-links";

describe("Phase 12.C: Commercial Contact Conversion", () => {
  const testData = {
    name: "Juan Pérez",
    serviceTitle: "Asesoría jurídica",
    jurisdiction: "Lima",
    preferredContactMedium: "whatsapp",
    description: "Requiero evaluar un caso civil sobre propiedad.",
  };

  it("builds a correct consultation message", () => {
    const message = buildConsultationMessage(testData);
    expect(message).toContain("Juan Pérez");
    expect(message).toContain("Asesoría jurídica");
    expect(message).toContain("Lima");
    expect(message).toContain("WhatsApp");
    expect(message).toContain("Requiero evaluar un caso civil sobre propiedad.");
    expect(message).toContain("Declaro haber leído la Política de privacidad.");
  });

  it("builds a correct WhatsApp URL", () => {
    const url = buildConsultationWhatsAppUrl(testData);
    expect(url).toContain("https://wa.me/51922038147");
    expect(url).toContain("text=");
    expect(url).toContain("Juan+P%C3%A9rez");
  });

  it("builds a correct Email URL", () => {
    const emailData = { ...testData, preferredContactMedium: "email" };
    const url = buildConsultationEmailUrl(emailData);
    expect(url).toContain("mailto:eduardo@buholex.com");
    expect(url).toContain("subject=Solicitud%20de%20evaluaci%C3%B3n%3A%20Asesor%C3%ADa%20jur%C3%ADdica");
    expect(url).toContain("body=");
    expect(url).toContain("Correo%20electr%C3%B3nico");
  });
});
