import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExposureAuditPreviewCard } from "../components/jurisprudence/admin/exposure-audit-preview-card";
import type { JurisprudenceExposureAuditResult } from "../types/jurisprudence-exposure-audit";

describe("Phase 11.Q: Exposure Audit Preview Component", () => {
  const mockResult: JurisprudenceExposureAuditResult = {
    status: "ready_for_human_review",
    simulated: true,
    publicProjection: {
      slug: "test",
      title: "Test",
      caseNumber: "123",
      resolutionNumber: "123",
      resolutionType: "Sentencia",
      institutionName: "Inst",
      issuingBody: "Body",
      matter: "Derechos Fundamentales",
      issuedAt: "2024-01-01",
      summary: "Resumen",
      sourceName: "Tribunal",
      caseTitle: "Test"
    },
    includedFields: ["slug", "title"],
    excludedFields: ["recordId"],
    blockers: [],
    readiness: { isReady: true, checkedAt: "2023-01-01" },
    warnings: []
  };

  it("15. El componente renderiza 'Vista previa simulada'", () => {
    render(<ExposureAuditPreviewCard auditResult={mockResult} />);
    expect(screen.getByText("Vista previa simulada")).toBeDefined();
  });

  it("16. El componente renderiza 'Sin efectos operativos'", () => {
    render(<ExposureAuditPreviewCard auditResult={mockResult} />);
    expect(screen.getByText("Sin efectos operativos")).toBeDefined();
  });

  it("17. El componente no contiene botones de aprobar o publicar", () => {
    render(<ExposureAuditPreviewCard auditResult={mockResult} />);
    const buttons = screen.queryAllByRole("button");
    const buttonTexts = buttons.map(b => b.textContent?.toLowerCase() || "");
    expect(buttonTexts.some(t => t.includes("aprobar") || t.includes("publicar"))).toBe(false);
  });
});
