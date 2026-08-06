import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacidad/page";
import TermsPage, { metadata as termsMetadata } from "@/app/terminos/page";
import { siteConfig } from "@/lib/site-config";
import { SiteFooter } from "@/components/site-footer";

describe("Políticas de Privacidad y Términos V1", () => {
  it("contiene la identidad legal correcta en site-config", () => {
    expect(siteConfig.legalName).toBe("EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.");
    expect(siteConfig.ruc).toBe("20571585902");
    expect(siteConfig.legalAddress).toBe("Jr. Gálvez N.° 844, Barranca, Lima, Perú");
    expect(siteConfig.contact.email).toBe("eduardo@buholex.com");
  });

  it("exporta la metadata correcta", () => {
    expect(privacyMetadata.description).toContain("Política de privacidad de BúhoLex y tratamiento de datos personales.");
    expect(termsMetadata.description).toContain("Términos y condiciones de uso de BúhoLex.");
  });

  describe("Página de Privacidad", () => {
    it("renderiza el contenido y secciones obligatorias sin placeholders ni datos no autorizados", () => {
      render(<PrivacyPage />);

      const content = document.body.textContent;

      // Ausencia de placeholders y notFound() (implícito si renderiza)
      expect(content).not.toContain("REVISIÓN LEGAL LOCAL");
      expect(content).not.toContain("Solo visible en desarrollo");
      expect(content).not.toContain("Este recurso permanece fuera de publicación");
      expect(content).not.toContain("NODE_ENV");

      // Identidad y secciones mínimas
      expect(content).toContain("EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.");
      expect(content).toContain("20571585902");
      expect(content).toContain("Jr. Gálvez N.° 844, Barranca, Lima, Perú");
      expect(content).toContain("eduardo@buholex.com");

      // Mención de derechos ARCO
      expect(content).toContain("derechos de acceso, rectificación, cancelación y oposición");

      // WhatsApp y Zoho
      expect(content).toContain("WhatsApp");
      expect(content).toContain("Zoho");

      // Búho Analítico
      expect(content).toContain("simulada");
      expect(content).toContain("efímero");
      expect(content).toContain("No existe inteligencia artificial externa conectada al sistema");

      // Cookies
      expect(content).toContain("BúhoLex no utiliza cookies publicitarias");

      // Bancos de datos
      expect(content).toContain("culminará la inscripción");

      // Pagos
      expect(content).not.toContain("suscripción");
      expect(content).not.toContain("membresía");
    });
  });

  describe("Página de Términos", () => {
    it("renderiza el contenido y condiciones exigidas", () => {
      render(<TermsPage />);
      const content = document.body.textContent;

      expect(content).toContain("EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.");
      expect(content).toContain("20571585902");

      // Búho Analítico simulado
      expect(content).toContain("entorno simulado");

      // Ausencia de afirmaciones comerciales
      expect(content).toContain("No existen créditos");
      expect(content).toContain("No existe almacenamiento de expedientes");
      expect(content).toContain("no se encuentran técnicamente habilitados");

      // Prohibiciones
      expect(content).toContain("scraping abusivo");
      expect(content).toContain("repositorio no autorizado de expedientes");
    });
  });

  describe("Footer", () => {
    it("muestra la identidad institucional y jurídica", () => {
      render(<SiteFooter />);
      const content = document.body.textContent;

      expect(content).toContain("Una plataforma de EMCCON");
      expect(content).toContain("EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C.");
      expect(content).toContain("20571585902");
      expect(content).toContain("Jr. Gálvez N.° 844, Barranca, Lima, Perú");
    });
  });
});
