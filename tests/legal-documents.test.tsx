import { describe, it, expect } from "vitest";
import { LEGAL_DOCUMENTS, getLegalDocument } from "@/lib/legal/legal-documents";
import { PrivacyPolicyV1 } from "@/lib/legal/privacy/v1";
import { TermsAndConditionsV1 } from "@/lib/legal/terms/v1";
import { CookieNoticeV1 } from "@/lib/legal/cookies/v1";
import { render, screen } from "@testing-library/react";

const LEGAL_V1_RELEASE_TIMESTAMP = "2026-10-28T22:15:28-05:00";

describe("Registro Central de Documentos Legales", () => {
  it("contiene los tres contratos legales canónicos tipados", () => {
    expect(LEGAL_DOCUMENTS).toHaveProperty("privacy");
    expect(LEGAL_DOCUMENTS).toHaveProperty("terms");
    expect(LEGAL_DOCUMENTS).toHaveProperty("cookies");
  });

  it("mantiene versión 1.0 para todos los documentos", () => {
    expect(LEGAL_DOCUMENTS.privacy.version).toBe("1.0");
    expect(LEGAL_DOCUMENTS.terms.version).toBe("1.0");
    expect(LEGAL_DOCUMENTS.cookies.version).toBe("1.0");
  });

  it("mantiene rutas canónicas correctas sin redirects innecesarios", () => {
    expect(LEGAL_DOCUMENTS.privacy.canonicalPath).toBe("/privacidad");
    expect(LEGAL_DOCUMENTS.terms.canonicalPath).toBe("/terminos");
    expect(LEGAL_DOCUMENTS.cookies.canonicalPath).toBe("/cookies");
  });

  it("custodia las fechas oficiales e inmutables del release legal V1.0", () => {
    expect(LEGAL_DOCUMENTS.privacy.version).toBe("1.0");
    expect(LEGAL_DOCUMENTS.privacy.publishedAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.privacy.effectiveAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.privacy.canonicalPath).toBe("/privacidad");

    expect(LEGAL_DOCUMENTS.terms.version).toBe("1.0");
    expect(LEGAL_DOCUMENTS.terms.publishedAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.terms.effectiveAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.terms.canonicalPath).toBe("/terminos");

    expect(LEGAL_DOCUMENTS.cookies.version).toBe("1.0");
    expect(LEGAL_DOCUMENTS.cookies.publishedAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.cookies.effectiveAt).toBe(LEGAL_V1_RELEASE_TIMESTAMP);
    expect(LEGAL_DOCUMENTS.cookies.canonicalPath).toBe("/cookies");
  });

  it("getLegalDocument devuelve el documento solicitado", () => {
    const doc = getLegalDocument("privacy");
    expect(doc.id).toBe("privacy");
    expect(doc.title).toBe("Política de Privacidad y Tratamiento de Datos Personales de BúhoLex");
  });
});

describe("Renderizado de Documentos Legales 1.0", () => {
  it("renderiza la Política de Privacidad 1.0 con texto aprobado", () => {
    render(<PrivacyPolicyV1 />);
    expect(screen.getByRole("heading", { name: "1. Identificación del responsable" })).toBeInTheDocument();
    expect(screen.getByText(/EMPRESA CONSTRUCTORA, CONSULTORA, BIENES Y SERVICIOS EN GENERAL JULITA S.A.C./i)).toBeInTheDocument();
    expect(screen.getByText(/20571585902/i)).toBeInTheDocument();
    expect(screen.getAllByText(/eduardo@buholex.com/i)[0]).toBeInTheDocument();
  });

  it("renderiza los Términos y Condiciones 1.0 con texto aprobado", () => {
    render(<TermsAndConditionsV1 />);
    expect(screen.getByRole("heading", { name: "1. Identidad, objeto y ámbito de aplicación" })).toBeInTheDocument();
    expect(screen.getAllByText(/Jr. José Gálvez N.° 844, Barranca, Lima, Perú/i)[0]).toBeInTheDocument();
  });

  it("renderiza el Aviso de Cookies 1.0 con texto aprobado", () => {
    render(<CookieNoticeV1 />);
    expect(screen.getByRole("heading", { name: "1. Objeto" })).toBeInTheDocument();
    expect(screen.getAllByText(/Vercel Web Analytics/i)[0]).toBeInTheDocument();
  });
});
