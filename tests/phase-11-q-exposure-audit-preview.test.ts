import { describe, it, expect } from "vitest";
import { createJurisprudenceExposureAuditPreview } from "../lib/jurisprudence-exposure-audit-preview";
import type { JurisprudencePublicReadModel } from "../types/jurisprudence-public-exposure";

describe("Phase 11.Q: Exposure Audit Preview Logic", () => {
  const validModel: Partial<JurisprudencePublicReadModel> = {
    slug: "sentencia-123",
    title: "Sentencia de Prueba",
    caseNumber: "CASE-123",
    resolutionNumber: "RES-123",
    resolutionType: "Sentencia",
    institutionName: "Corte",
    issuingBody: "Sala Primera",
    matter: "Penal",
    issuedAt: "2023-01-01",
    summary: "Resumen de prueba",
    sourceName: "Fuente Oficial",
    sourceDocumentId: "doc-123",
    publicStatus: "prepared_internal",
    publicRecordId: "pr-123",
    recordId: "rec-123",
    recordVersion: 1,
    publicRevision: 1,
  };

  it("1. La auditoría es determinista y 2. El input original no es mutado", () => {
    const input = { readModel: { ...validModel }, activationAuthorized: true, checkedAt: "2023-01-01T00:00:00.000Z" };
    const inputCopy = JSON.parse(JSON.stringify(input));
    const result1 = createJurisprudenceExposureAuditPreview(input);
    const result2 = createJurisprudenceExposureAuditPreview(input);

    expect(result1).toEqual(result2);
    expect(input).toEqual(inputCopy);
  });

  it("3. El resultado es serializable", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: validModel, activationAuthorized: true });
    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized).toEqual(result);
  });

  it("4. La proyección reutiliza la allowlist vigente y 5. Los campos públicos permitidos aparecen correctamente", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: validModel, activationAuthorized: true });
    expect(result.publicProjection).toBeDefined();
    expect(result.includedFields).toContain("slug");
    expect(result.includedFields).toContain("title");
  });

  it("6. Los identificadores internos no aparecen en publicProjection y 7. Los valores sensibles excluidos no aparecen serializados", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: validModel, activationAuthorized: true });
    expect(result.publicProjection).not.toHaveProperty("publicRecordId");
    expect(result.publicProjection).not.toHaveProperty("recordId");
    expect(result.publicProjection).not.toHaveProperty("recordVersion");
  });

  it("8. Los campos excluidos se reportan sin revelar sus valores", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: validModel, activationAuthorized: true });
    expect(result.excludedFields).toContain("publicRecordId");
    expect(result.excludedFields).toContain("recordId");
    expect(result.excludedFields.join(", ")).not.toContain("pr-123");
  });

  it("9. Un fixture incompleto queda blocked", () => {
    const incompleteModel = { ...validModel, slug: "" };
    const result = createJurisprudenceExposureAuditPreview({ readModel: incompleteModel, activationAuthorized: true });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("dossier incompleto");
  });

  it("10. Un fixture inválido retorna invalid_fixture", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: null });
    expect(result.status).toBe("invalid_fixture");
  });

  it("11. La falta de autorización institucional genera bloqueo", () => {
    const result = createJurisprudenceExposureAuditPreview({
      readModel: validModel,
      originalBlockers: ["authorization_missing"],
      activationAuthorized: true
    });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("autorización institucional ausente");
  });

  it("12. Una resolución retirada genera bloqueo", () => {
    const withdrawnModel = { ...validModel, publicStatus: "withdrawn" as const };
    const result = createJurisprudenceExposureAuditPreview({ readModel: withdrawnModel, activationAuthorized: true });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("resolución retirada");
  });

  it("13. Una resolución supersedida genera bloqueo", () => {
    const supersededModel = { ...validModel, publicStatus: "superseded" as const };
    const result = createJurisprudenceExposureAuditPreview({ readModel: supersededModel, activationAuthorized: true });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("resolución supersedida");
  });

  it("14. activationAuthorized: false permanece representado como bloqueo", () => {
    const result = createJurisprudenceExposureAuditPreview({ readModel: validModel, activationAuthorized: false });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toContain("exposición pública desactivada");
  });
});
