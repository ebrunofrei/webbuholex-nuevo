import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/database/client", () => ({
  getComplaintsAdminDatabase: vi.fn(() => ({ transaction: vi.fn(), select: vi.fn() })),
}));
vi.mock("@/database/adapters/complaints-postgres.adapter", () => ({
  createComplaintsAdminPersistenceAdapter: vi.fn(() => ({})),
}));
vi.mock("@/database/repositories/complaints.repository", () => ({
  createComplaintsAdminRepository: vi.fn(() => ({
    issueInitialProviderResponse: vi.fn(),
  })),
}));
vi.mock("@/lib/complaints/provider-response.builder", () => ({
  buildProviderResponsePlan: vi.fn(),
}));

import { getComplaintsAdminDatabase } from "@/database/client";
import { createComplaintsAdminRepository } from "@/database/repositories/complaints.repository";
import { buildProviderResponsePlan } from "@/lib/complaints/provider-response.builder";
import {
  ComplaintPersistenceError,
  SanitizedDatabaseConstraintError,
} from "@/database/repositories/complaints.errors";
import { submitProviderResponseRuntime, ProviderResponseRuntimeInput, TrustedAdminPrincipal } from "@/lib/complaints/complaints-admin-runtime";

describe("complaints-admin-runtime", () => {
  const baseInput: ProviderResponseRuntimeInput = {
    complaintId: "COMP-123",
    expectedCurrentStatus: "under_review",
    responseChannel: "email",
    responderName: "Admin User",
    responderRole: "Moderator",
    responseText: "Valid response text",
  };

  const basePrincipal: TrustedAdminPrincipal = {
    operatorId: "admin-uuid",
    identitySource: "authenticated_session",
  };

  const validPlan = {
    ok: true as const,
    plan: {
      responseInsert: {
        complaintId: "COMP-123",
        responseText: "Valid response text",
        actionsTaken: null,
        responseChannel: "email" as const,
        responderName: "Admin User",
        responderRole: "Moderator",
        respondedAt: new Date().toISOString(),
        isInitialResponse: true as const,
      },
      statusTransition: { complaintId: "COMP-123", fromStatus: "under_review" as const, toStatus: "answered" as const, changedAt: new Date().toISOString() },
      statusHistory: { complaintId: "COMP-123", fromStatus: "under_review" as const, toStatus: "answered" as const, changedAt: new Date().toISOString(), changedBy: "admin-uuid" },
      auditEvent: { complaintId: "COMP-123", eventType: "response_created" as const, metadata: { responseChannel: "email", isInitialResponse: true }, createdAt: new Date().toISOString(), createdBy: "admin-uuid" },
      outboxEvent: { complaintId: "COMP-123", eventType: "complaint_response_delivery_requested" as const, payload: { complaintId: "COMP-123", version: 1 } },
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildProviderResponsePlan).mockReturnValue(validPlan);
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "success" })
    } as never);
  });

  it("C1. archivo contiene import 'server-only'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(path.join(__dirname, "../lib/complaints/complaints-admin-runtime.ts"), "utf-8");
    expect(content).toMatch(/import ['"]server-only['"]/);
  });

  it("C2. ProviderResponseRuntimeInput no tiene campo operatorId", () => {
    type AssertNoOperatorId<T> = "operatorId" extends keyof T ? false : true;
    const test: AssertNoOperatorId<ProviderResponseRuntimeInput> = true;
    expect(test).toBe(true);
  });

  it("C3. Domain error — invalid_status", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_invalid_status", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_invalid_status" });
    expect(getComplaintsAdminDatabase).not.toHaveBeenCalled();
  });

  it("C4. Domain error — text_required", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_text_required", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_text_required" });
    expect(getComplaintsAdminDatabase).not.toHaveBeenCalled();
  });

  it("C5. Domain error — text_too_long", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_text_too_long", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_text_too_long" });
  });

  it("C6. Domain error — channel_invalid", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_channel_invalid", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_channel_invalid" });
  });

  it("C7. Domain error — responder_required", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_responder_required", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_responder_required" });
  });

  it("C8. Domain error — actions_too_long", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_actions_too_long", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_actions_too_long" });
  });

  it("C9. Config error: cuando buildProviderResponsePlan falla DB client no es llamado", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_invalid_status", message: "Error" } });
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(getComplaintsAdminDatabase).not.toHaveBeenCalled();
  });

  it("C10. Cadena correcta de instanciación DB -> adapter -> repo", async () => {
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(getComplaintsAdminDatabase).toHaveBeenCalled();
    expect(createComplaintsAdminRepository).toHaveBeenCalled();
  });

  it("C11. operatorId en repo proviene de principal.operatorId", async () => {
    let capturedInput: Record<string, unknown> | undefined;
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (input) => {
        capturedInput = input;
        return { kind: "success" };
      })
    } as never);
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(capturedInput?.operatorId).toBe("admin-uuid");
  });

  it("C12. buildProviderResponsePlan recibe operatorId del principal", async () => {
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(buildProviderResponsePlan).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: "admin-uuid" }),
      expect.any(Date)
    );
  });

  it("C13. Resultado success", async () => {
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "success" });
  });

  it("C14. Resultado complaint_not_found", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "complaint_not_found" })
    } as never);
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_not_found" });
  });

  it("C15. Resultado complaint_stale_status", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "complaint_stale_status" })
    } as never);
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_stale_status" });
  });

  it("C16. Resultado complaint_initial_response_already_exists", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "complaint_initial_response_already_exists" })
    } as never);
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_initial_response_already_exists" });
  });

  it("C17. repo retorna complaint_response_invalid_status -> runtime retorna complaint_domain_error", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "complaint_response_invalid_status" })
    } as never);
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_invalid_status" });
  });

  it("C18. ComplaintPersistenceError -> ComplaintsServiceUnavailableError", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockRejectedValue(new ComplaintPersistenceError("complaint_transaction_failed"))
    } as never);
    await expect(submitProviderResponseRuntime(baseInput, basePrincipal)).rejects.toThrow("complaints_admin_persistence_failed");
  });

  it("C19. SanitizedDatabaseConstraintError -> ComplaintsServiceUnavailableError", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockRejectedValue(new SanitizedDatabaseConstraintError("23503", null))
    } as never);
    await expect(submitProviderResponseRuntime(baseInput, basePrincipal)).rejects.toThrow("complaints_admin_persistence_failed");
  });

  it("C20. Error inesperado re-lanzado sin wrap", async () => {
    const error = new Error("unexpected bug");
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn().mockRejectedValue(error)
    } as never);
    await expect(submitProviderResponseRuntime(baseInput, basePrincipal)).rejects.toBe(error);
  });

  it("C21. respondedAt llega al repo como Date construida del ISO del plan", async () => {
    let capturedRespondedAt: Date | undefined;
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (input) => {
        capturedRespondedAt = input.respondedAt;
        return { kind: "success" };
      })
    } as never);
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(capturedRespondedAt).toBeInstanceOf(Date);
    expect(capturedRespondedAt!.toISOString()).toBe(validPlan.plan.responseInsert.respondedAt);
  });

  it("C22. responseText del plan (normalizado) llega al repo sin modificación adicional", async () => {
    let capturedResponseText: string | undefined;
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (input) => {
        capturedResponseText = input.responseText;
        return { kind: "success" };
      })
    } as never);
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(capturedResponseText).toBe("Valid response text");
  });

  it("C23. TrustedAdminPrincipal con identitySource 'authenticated_session' es aceptado", async () => {
    const principal: TrustedAdminPrincipal = { operatorId: "123", identitySource: "authenticated_session" };
    const result = await submitProviderResponseRuntime(baseInput, principal);
    expect(result).toEqual({ kind: "success" });
  });

  it("C24. TrustedAdminPrincipal con identitySource 'service_context' es aceptado", async () => {
    const principal: TrustedAdminPrincipal = { operatorId: "123", identitySource: "service_context" };
    const result = await submitProviderResponseRuntime(baseInput, principal);
    expect(result).toEqual({ kind: "success" });
  });

  it("C25. complaint_domain_error preserva el code exacto del error de dominio", async () => {
    vi.mocked(buildProviderResponsePlan).mockReturnValue({ ok: false, error: { code: "complaint_response_actions_too_long", message: "Error" } });
    const result = await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_domain_error", code: "complaint_response_actions_too_long" });
  });

  it("C26. Plan plan.statusTransition, plan.statusHistory, plan.auditEvent, plan.outboxEvent NO son pasados al repo", async () => {
    let capturedRepoInput: Record<string, unknown> = {};
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (input) => {
        capturedRepoInput = input as Record<string, unknown>;
        return { kind: "success" };
      }),
    } as never);
    await submitProviderResponseRuntime(baseInput, basePrincipal);
    expect(capturedRepoInput).not.toHaveProperty("statusTransition");
    expect(capturedRepoInput).not.toHaveProperty("statusHistory");
    expect(capturedRepoInput).not.toHaveProperty("auditEvent");
    expect(capturedRepoInput).not.toHaveProperty("outboxEvent");
  });

  it("DT-1. ProviderResponseDomainErrorCode es un type alias local, no una re-exportación ambigua", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(
      path.join(__dirname, "../lib/complaints/complaints-admin-runtime.ts"),
      "utf-8"
    );
    expect(content).toMatch(/import type \{[^}]*ProviderResponseErrorCode[^}]*\} from ['"]\.\/provider-response['"]/);
    expect(content).toMatch(/export type ProviderResponseDomainErrorCode = ProviderResponseErrorCode/);
    expect(content).not.toMatch(/export type \{[^}]*ProviderResponseErrorCode as ProviderResponseDomainErrorCode[^}]*\} from/);
  });

  it("DT-2. buildProviderResponsePlan recibe el mismo Date que el repository clock", async () => {
    let capturedBuilderNow: Date | undefined;
    let capturedRepoNow: Date | undefined;

    vi.mocked(buildProviderResponsePlan).mockImplementation((_input, now) => {
      capturedBuilderNow = now;
      return validPlan;
    });

    vi.mocked(createComplaintsAdminRepository).mockImplementation((_adapter, clock) => {
      capturedRepoNow = clock.now();
      return { issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "success" }) } as never;
    });

    await submitProviderResponseRuntime(baseInput, basePrincipal);

    expect(capturedBuilderNow).toBeInstanceOf(Date);
    expect(capturedRepoNow).toBeInstanceOf(Date);
    expect(capturedBuilderNow!.getTime()).toBe(capturedRepoNow!.getTime());
  });

  it("DT-3. respondedAt llega al repo como Date derivada del now único del runtime", async () => {
    let capturedNowFromBuilder: Date | undefined;
    let capturedRespondedAt: unknown;

    vi.mocked(buildProviderResponsePlan).mockImplementation((_input, now) => {
      capturedNowFromBuilder = now;
      return {
        ok: true as const,
        plan: {
          ...validPlan.plan,
          responseInsert: {
            ...validPlan.plan.responseInsert,
            respondedAt: now!.toISOString(),
          },
        },
      };
    });

    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (repoInput) => {
        capturedRespondedAt = repoInput.respondedAt;
        return { kind: "success" };
      }),
    } as never);

    await submitProviderResponseRuntime(baseInput, basePrincipal);

    expect(capturedRespondedAt).toBeInstanceOf(Date);
    expect((capturedRespondedAt as Date).getTime()).toBe(capturedNowFromBuilder!.getTime());
  });

  it("DT-4. el clock inyectado al repository devuelve siempre el mismo now de la invocación", async () => {
    const clockNowResults: Date[] = [];

    vi.mocked(createComplaintsAdminRepository).mockImplementation((_adapter, clock) => {
      clockNowResults.push(clock.now());
      clockNowResults.push(clock.now());
      return { issueInitialProviderResponse: vi.fn().mockResolvedValue({ kind: "success" }) } as never;
    });

    await submitProviderResponseRuntime(baseInput, basePrincipal);

    expect(clockNowResults).toHaveLength(2);
    expect(clockNowResults[0]!.getTime()).toBe(clockNowResults[1]!.getTime());
    expect(clockNowResults[0]).toBe(clockNowResults[1]);
  });

  it("DT-5. plan.statusTransition, plan.statusHistory, plan.auditEvent, plan.outboxEvent no son pasados al repo", async () => {
    let capturedRepoInput: Record<string, unknown> = {};

    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      issueInitialProviderResponse: vi.fn(async (input) => {
        capturedRepoInput = input as Record<string, unknown>;
        return { kind: "success" };
      }),
    } as never);

    await submitProviderResponseRuntime(baseInput, basePrincipal);

    expect(capturedRepoInput).not.toHaveProperty("statusTransition");
    expect(capturedRepoInput).not.toHaveProperty("statusHistory");
    expect(capturedRepoInput).not.toHaveProperty("auditEvent");
    expect(capturedRepoInput).not.toHaveProperty("outboxEvent");
    expect(capturedRepoInput).toHaveProperty("complaintId");
    expect(capturedRepoInput).toHaveProperty("expectedCurrentStatus");
    expect(capturedRepoInput).toHaveProperty("responseText");
    expect(capturedRepoInput).toHaveProperty("respondedAt");
    expect(capturedRepoInput).toHaveProperty("operatorId");
  });
});
