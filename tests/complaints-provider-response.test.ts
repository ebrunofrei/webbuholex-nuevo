import { describe, it, expect } from "vitest";
import { buildProviderResponsePlan } from "../lib/complaints/provider-response.builder";
import { ProviderResponseIssueInput } from "../lib/complaints/provider-response";
import { COMPLAINT_LIMITS } from "../lib/complaints/complaint.constants";

describe("Provider Response Domain Contracts", () => {
  const baseInput: ProviderResponseIssueInput = {
    complaintId: "00000000-0000-0000-0000-000000000000",
    currentStatus: "under_review",
    operatorId: "operator-123",
    responseChannel: "email",
    responderName: "Juan Pérez",
    responderRole: "Atención al Cliente",
    responseText: "Se procedió a revisar su caso y se emitió una nota de crédito.",
  };

  const fixtureCase: ProviderResponseIssueInput = {
    ...baseInput,
    responseText: "Se deja constancia de que la presente hoja fue generada como parte de una prueba técnica controlada del Libro de Reclamaciones Virtual de BúhoLex y no corresponde a una reclamación o queja real de consumidor.",
  };

  it("1. response normal válida desde under_review", () => {
    const result = buildProviderResponsePlan(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.statusTransition.toStatus).toBe("answered");
    }
  });

  it("2. response normal válida desde awaiting_information", () => {
    const result = buildProviderResponsePlan({ ...baseInput, currentStatus: "awaiting_information" });
    expect(result.ok).toBe(true);
  });

  it("3. received rechaza emisión directa", () => {
    const result = buildProviderResponsePlan({ ...baseInput, currentStatus: "received" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_invalid_status");
    }
  });

  it("4. answered rechaza segunda emisión inicial", () => {
    const result = buildProviderResponsePlan({ ...baseInput, currentStatus: "answered" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_invalid_status");
    }
  });

  it("5. closed rechaza emisión", () => {
    const result = buildProviderResponsePlan({ ...baseInput, currentStatus: "closed" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_invalid_status");
    }
  });

  it("6. responseText vacío rechaza", () => {
    const result = buildProviderResponsePlan({ ...baseInput, responseText: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_text_required");
    }
  });

  it("7. responseText whitespace-only rechaza", () => {
    const result = buildProviderResponsePlan({ ...baseInput, responseText: "   \n  " });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_text_required");
    }
  });

  it("8. límite máximo respetado (rechaza si excede)", () => {
    const longText = "a".repeat(COMPLAINT_LIMITS.facts + 1);
    const result = buildProviderResponsePlan({ ...baseInput, responseText: longText });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_text_too_long");
    }
  });

  it("9. responseChannel inválido rechaza", () => {
    // @ts-expect-error testing invalid channel
    const result = buildProviderResponsePlan({ ...baseInput, responseChannel: "pigeon" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_channel_invalid");
    }
  });

  it("10. responderName requerido", () => {
    const result = buildProviderResponsePlan({ ...baseInput, responderName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_responder_required");
    }
  });

  it("11. responderRole requerido", () => {
    const result = buildProviderResponsePlan({ ...baseInput, responderRole: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("complaint_response_responder_required");
    }
  });

  it("12. actionsTaken opcional (pero responseText es obligatorio)", () => {
    const result = buildProviderResponsePlan({ ...baseInput, actionsTaken: "Resolvimos" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.responseInsert.responseText).toBe(baseInput.responseText);
      expect(result.plan.responseInsert.actionsTaken).toBe("Resolvimos");
    }
  });

  it("13. plan genera transition -> answered", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      expect(result.plan.statusTransition).toMatchObject({
        fromStatus: "under_review",
        toStatus: "answered",
        complaintId: baseInput.complaintId,
      });
      expect(result.plan.statusHistory).toMatchObject({
        fromStatus: "under_review",
        toStatus: "answered",
        complaintId: baseInput.complaintId,
        changedBy: baseInput.operatorId,
      });
    }
  });

  it("14. plan genera response_created audit event", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      expect(result.plan.auditEvent).toMatchObject({
        eventType: "response_created",
        complaintId: baseInput.complaintId,
        createdBy: baseInput.operatorId,
      });
      expect(result.plan.auditEvent.metadata.responseChannel).toBe("email");
    }
  });

  it("15. plan genera complaint_response_delivery_requested outbox event", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      expect(result.plan.outboxEvent).toMatchObject({
        eventType: "complaint_response_delivery_requested",
        complaintId: baseInput.complaintId,
      });
      expect(result.plan.outboxEvent.payload).toHaveProperty("complaintId", baseInput.complaintId);
    }
  });

  it("16. raw token ausente del plan", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      const planStr = JSON.stringify(result.plan);
      expect(planStr).not.toContain("token");
    }
  });

  it("17. hashes ausentes del plan", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      const planStr = JSON.stringify(result.plan);
      expect(planStr).not.toContain("hash");
    }
  });

  it("18. UUID público inexistente (solo internal complaintId)", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      const planStr = JSON.stringify(result.plan);
      expect(planStr).not.toContain("publicUuid");
    }
  });

  it("19. response original modelada como immutable version intent (isInitialResponse: true)", () => {
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      expect(result.plan.responseInsert.isInitialResponse).toBe(true);
    }
  });

  it("20. correction no pasa por issueInitialResponse", () => {
    // This is enforced implicitly by the structure since buildProviderResponsePlan only returns isInitialResponse = true.
    const result = buildProviderResponsePlan(baseInput);
    if (result.ok) {
      expect(result.plan.responseInsert.isInitialResponse).toBe(true);
      expect(!("supersedesResponseId" in result.plan.responseInsert)).toBe(true);
    }
  });

  it("Fixture LR-2026-000001 (Proof of Concept)", () => {
    const result = buildProviderResponsePlan(fixtureCase);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.responseInsert.responseText).toContain("prueba técnica controlada");
    }
  });
});
