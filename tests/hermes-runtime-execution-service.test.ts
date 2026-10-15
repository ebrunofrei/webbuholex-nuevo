// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  HermesRuntimeExecutionService,
  readHermesRuntimeLimitsConfig,
  readHermesReservationTtlConfig,
  FROZEN_HERMES_MAX_PROVIDER_TIMEOUT_MS,
  DEFAULT_HERMES_LEASE_TTL_SECONDS,
  DEFAULT_HERMES_RESERVATION_TTL_SECONDS,
} from "@/lib/hermes/runtime/hermes-runtime-execution-service";
import type {
  HermesExecuteJurisprudenceInput,
} from "@/lib/hermes/runtime/hermes-runtime-execution-service";
import type {
  HermesSubjectRepository,
  HermesSubjectResolutionResult,
} from "@/lib/hermes/control/hermes-subject-repository";
import type {
  HermesEntitlementRepository,
  HermesEntitlementLookupResult,
} from "@/lib/hermes/control/hermes-entitlement-repository";
import type {
  HermesQuotaCoordinator,
  HermesOperationReservationResult,
  HermesFinalizationResult,
  HermesExpiredReservationScanResult,
} from "@/lib/hermes/control/hermes-quota-coordinator";
import type {
  HermesProviderBoundaryCoordinator,
  HermesProviderBoundaryResult,
  HermesLeaseReleaseResult,
  HermesProviderBoundaryLimits,
} from "@/lib/hermes/control/hermes-provider-boundary-coordinator";
import type {
  JurisprudencePreparationResult,
} from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";
import type {
  HermesProviderPort,
} from "@/lib/hermes/contracts/hermes-provider-port";
import type { HermesProviderOutcome } from "@/lib/hermes/contracts/hermes-envelope";
import type { JurisprudenceInterpretation } from "@/lib/hermes/contracts/jurisprudence-interpretation";

const VALID_UUID = "33333333-3333-4333-8333-333333333333";
const VALID_SUBJECT_ID = "44444444-4444-4444-8444-444444444444";
const VALID_OPERATION_ID = "55555555-5555-4555-8555-555555555555";

const validInterpretationPayload: JurisprudenceInterpretation = {
  summary: "Resumen jurídico de prueba sobre nulidad de acto administrativo.",
  legalMatter: "Derecho Administrativo",
  legalIssues: ["Determinación de competencia", "Debido procedimiento administrativo"],
  ratioDecidendi: {
    status: "identified",
    text: "El acto administrativo emitido por órgano incompetente adolece de nulidad absoluta.",
    support: [{
      quote: "El acto administrativo emitido por órgano incompetente es nulo de pleno derecho.",
      paragraphReference: "párrafo 14",
      pageReference: "pág. 5",
    }],
  },
  obiterDicta: [],
  citedNorms: [],
  citedPrecedents: [],
  keyCriteria: ["Principio de legalidad y competencia"],
  scope: "Nacional en sede contencioso-administrativa",
  limitations: "Aplica únicamente a nulidades de pleno derecho",
  citations: [{
    quote: "El acto administrativo emitido por órgano incompetente es nulo de pleno derecho.",
    paragraphReference: "párrafo 14",
    pageReference: "pág. 5",
  }],
  verificationStatus: "machine_generated_unverified",
};

function createMockHarness(overrides: {
  subjectResolution?: HermesSubjectResolutionResult;
  subjectThrow?: Error;
  entitlementLookup?: HermesEntitlementLookupResult;
  preparationResult?: JurisprudencePreparationResult;
  reservationResult?: HermesOperationReservationResult;
  boundaryResult?: HermesProviderBoundaryResult;
  leaseReleaseResult?: HermesLeaseReleaseResult;
  providerResult?: HermesProviderOutcome;
  providerThrow?: Error;
  groundingResult?: boolean;
  commitSuccessResult?: HermesFinalizationResult;
  markPolicyPendingResult?: HermesFinalizationResult;
  providerTimeoutMs?: number;
  reservationTtlSeconds?: number;
  maxFinalizerAttempts?: number;
  limits?: HermesProviderBoundaryLimits;
} = {}) {
  const callOrder: string[] = [];

  const subjectRepository: HermesSubjectRepository = {
    resolveOrCreateSubject: vi.fn(async (): Promise<HermesSubjectResolutionResult> => {
      callOrder.push("subjectRepository.resolveOrCreateSubject");
      if (overrides.subjectThrow) {
        throw overrides.subjectThrow;
      }
      if (overrides.subjectResolution !== undefined) {
        return overrides.subjectResolution;
      }
      return {
        kind: "resolved",
        subjectId: VALID_SUBJECT_ID,
      };
    }),
  };

  const entitlementRepository: HermesEntitlementRepository = {
    getEntitlement: vi.fn(async (): Promise<HermesEntitlementLookupResult> => {
      callOrder.push("entitlementRepository.getEntitlement");
      if (overrides.entitlementLookup !== undefined) {
        return overrides.entitlementLookup;
      }
      return {
        kind: "found",
        entitlement: {
          subjectId: VALID_SUBJECT_ID,
          planTier: "pro",
          status: "active",
          monthlyQuota: 100,
          periodStart: new Date(Date.now() - 86400000),
          periodEnd: new Date(Date.now() + 86400000 * 30),
        },
      };
    }),
  };

  const domainOrchestrator = {
    prepareInterpretation: vi.fn(async (recordId: string, recordVersion: number): Promise<JurisprudencePreparationResult> => {
      callOrder.push("domainOrchestrator.prepareInterpretation");
      if (overrides.preparationResult !== undefined) {
        return overrides.preparationResult;
      }
      return {
        ok: true,
        recordId,
        recordVersion,
        sourceText: "Texto íntegro de la resolución para respaldo de citas textuales.",
        request: {
          messages: [
            {
              role: "system",
              content: "policy",
              classification: "TRUSTED_SYSTEM_POLICY",
            },
            {
              role: "user",
              content: "analyze",
              classification: "USER_PROVIDED_LEGAL_TEXT",
            },
          ],
          structuredOutputIntent: "buholex_jurisprudence_interpretation",
          metadata: { analysisId: recordId, locale: "es-PE" },
        },
      };
    }),
    validateGrounding: vi.fn(() => {
      callOrder.push("domainOrchestrator.validateGrounding");
      return overrides.groundingResult ?? true;
    }),
  };

  const quotaCoordinator: HermesQuotaCoordinator = {
    reserveOperationQuota: vi.fn(async (): Promise<HermesOperationReservationResult> => {
      callOrder.push("quotaCoordinator.reserveOperationQuota");
      if (overrides.reservationResult !== undefined) {
        return overrides.reservationResult;
      }
      return {
        kind: "reserved",
        operationId: VALID_OPERATION_ID,
        status: "reserved",
        userQuotaStatus: "reserved",
        platformCostStatus: "none",
        units: 1,
        quotaPeriodStart: new Date(),
        quotaPeriodEnd: new Date(Date.now() + 86400000 * 30),
        reservedExpiresAt: new Date(Date.now() + 105000),
      };
    }),
    commitSuccessWithLease: vi.fn(async (opId: string = VALID_OPERATION_ID): Promise<HermesFinalizationResult> => {
      callOrder.push("quotaCoordinator.commitSuccessWithLease");
      if (overrides.commitSuccessResult !== undefined) {
        return overrides.commitSuccessResult;
      }
      return {
        kind: "finalized",
        operationId: opId,
        status: "completed_success",
        userQuotaStatus: "committed",
        platformCostStatus: "assumed_incurred",
        units: 1,
      };
    }),
    markPolicyPendingWithLease: vi.fn(async (opId: string, targetStatus: "completed_validation_failure" | "completed_grounding_failure" | "outcome_unknown"): Promise<HermesFinalizationResult> => {
      callOrder.push(`quotaCoordinator.markPolicyPendingWithLease:${targetStatus}`);
      if (overrides.markPolicyPendingResult !== undefined) {
        return overrides.markPolicyPendingResult;
      }
      return {
        kind: "finalized",
        operationId: opId,
        status: targetStatus,
        userQuotaStatus: "policy_pending",
        platformCostStatus: "assumed_incurred",
        units: 1,
      };
    }),
    releaseReservation: vi.fn(async (): Promise<HermesFinalizationResult> => {
      callOrder.push("quotaCoordinator.releaseReservation");
      return {
        kind: "finalized",
        operationId: VALID_OPERATION_ID,
        status: "released",
        userQuotaStatus: "released",
        platformCostStatus: "none",
        units: 1,
      };
    }),
    expireReservation: vi.fn(async (): Promise<HermesFinalizationResult> => {
      callOrder.push("quotaCoordinator.expireReservation");
      return {
        kind: "finalized",
        operationId: VALID_OPERATION_ID,
        status: "expired_before_dispatch",
        userQuotaStatus: "released",
        platformCostStatus: "none",
        units: 1,
      };
    }),
    findExpiredReservations: vi.fn(async (): Promise<HermesExpiredReservationScanResult> => {
      callOrder.push("quotaCoordinator.findExpiredReservations");
      return { kind: "found", records: [] };
    }),
  };

  const providerBoundaryCoordinator: HermesProviderBoundaryCoordinator = {
    beginProviderDispatch: vi.fn(async (): Promise<HermesProviderBoundaryResult> => {
      callOrder.push("providerBoundaryCoordinator.beginProviderDispatch");
      if (overrides.boundaryResult !== undefined) {
        return overrides.boundaryResult;
      }
      return {
        kind: "started",
        operationId: VALID_OPERATION_ID,
        leaseId: "lease-123",
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        dispatchStartedAt: new Date(),
      };
    }),
    releaseConcurrencyLease: vi.fn(async (): Promise<HermesLeaseReleaseResult> => {
      callOrder.push("providerBoundaryCoordinator.releaseConcurrencyLease");
      if (overrides.leaseReleaseResult !== undefined) {
        return overrides.leaseReleaseResult;
      }
      return {
        kind: "released",
        operationId: VALID_OPERATION_ID,
        leaseId: "lease-123",
      };
    }),
  };

  const providerPort: HermesProviderPort = {
    generateStructuredOutput: vi.fn(async (): Promise<HermesProviderOutcome> => {
      callOrder.push("providerPort.generateStructuredOutput");
      if (overrides.providerThrow) {
        throw overrides.providerThrow;
      }
      if (overrides.providerResult !== undefined) {
        return overrides.providerResult;
      }
      return {
        ok: true,
        payload: validInterpretationPayload,
      };
    }),
  };

  const sleep = vi.fn(async () => {});

  const service = new HermesRuntimeExecutionService({
    subjectRepository,
    entitlementRepository,
    quotaCoordinator,
    providerBoundaryCoordinator,
    domainOrchestrator,
    providerPort,
    limits: overrides.limits ?? {
      concurrencyLimit: 10,
      dailyProviderCallLimit: 1000,
      leaseTtlSeconds: 75,
    },
    providerTimeoutMs: overrides.providerTimeoutMs,
    reservationTtlSeconds: overrides.reservationTtlSeconds,
    maxFinalizerAttempts: overrides.maxFinalizerAttempts,
    sleep,
  });

  const defaultInput: HermesExecuteJurisprudenceInput = {
    identity: {
      provider: "auth0",
      providerSubjectId: "auth0|test-user-123",
    },
    idempotencyKey: VALID_UUID,
    recordId: "rec-canonical-001",
    recordVersion: 1,
  };

  return {
    service,
    defaultInput,
    callOrder,
    subjectRepository,
    entitlementRepository,
    domainOrchestrator,
    quotaCoordinator,
    providerBoundaryCoordinator,
    providerPort,
    sleep,
  };
}

describe("HermesRuntimeExecutionService (HERMES-PROD-A3.6B)", () => {
  // 1. unauthorized / unresolved identity -> no provider
  it("1. unauthorized / unresolved identity -> no provider", async () => {
    const h = createMockHarness({
      subjectThrow: new Error("Subject identity unresolvable"),
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("subject_resolution_failed");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.reserveOperationQuota).not.toHaveBeenCalled();
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
  });

  // 2. not entitled -> no quota/provider
  it("2. not entitled -> no quota/provider", async () => {
    const h = createMockHarness({
      entitlementLookup: { kind: "absent" },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("feature_not_entitled");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.reserveOperationQuota).not.toHaveBeenCalled();
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
  });

  // 3. document preparation failure -> no quota/provider
  it("3. document preparation failure -> no quota/provider", async () => {
    const h = createMockHarness({
      preparationResult: { ok: false, code: "record_not_found" },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("record_not_found");
    }
    expect(h.quotaCoordinator.reserveOperationQuota).not.toHaveBeenCalled();
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 4. quota exhausted -> no A3.5/provider
  it("4. quota exhausted -> no A3.5/provider", async () => {
    const h = createMockHarness({
      reservationResult: {
        kind: "quota_exhausted",
        requestedUnits: 1,
        monthlyQuota: 10,
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("quota_exhausted");
    }
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 5. duplicate_in_flight -> no provider
  it("5. duplicate_in_flight -> no provider", async () => {
    const h = createMockHarness({
      reservationResult: {
        kind: "duplicate_in_flight",
        operationId: VALID_OPERATION_ID,
        existingStatus: "reserved",
        existingUserQuotaStatus: "reserved",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("duplicate_in_flight");
    }
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 6. already_completed -> no provider
  it("6. already_completed -> no provider", async () => {
    const h = createMockHarness({
      reservationResult: {
        kind: "already_completed",
        operationId: VALID_OPERATION_ID,
        existingStatus: "completed_success",
        existingUserQuotaStatus: "committed",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("already_completed");
    }
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 7. active_document_conflict -> no provider
  it("7. active_document_conflict -> no provider", async () => {
    const h = createMockHarness({
      reservationResult: {
        kind: "active_document_conflict",
        subjectId: VALID_SUBJECT_ID,
        recordId: "doc-1",
        recordVersion: 1,
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("active_document_conflict");
    }
    expect(h.providerBoundaryCoordinator.beginProviderDispatch).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 8. A3.5 concurrency capacity denial -> no provider
  it("8. A3.5 concurrency capacity denial -> no provider", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "concurrency_capacity_exceeded",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("concurrency_capacity_exceeded");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.releaseReservation).toHaveBeenCalledWith(VALID_OPERATION_ID);
  });

  // 9. subject concurrency denial -> no provider
  it("9. subject concurrency denial -> no provider", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "subject_concurrency_conflict",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("subject_concurrency_conflict");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.releaseReservation).toHaveBeenCalledWith(VALID_OPERATION_ID);
  });

  // 10. daily limit exhausted -> no provider
  it("10. daily limit exhausted -> no provider", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "daily_limit_exhausted",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("daily_limit_exhausted");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.releaseReservation).toHaveBeenCalledWith(VALID_OPERATION_ID);
  });

  // 11. reservation expired -> no provider
  it("11. reservation expired -> no provider", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "reservation_expired",
        operationId: VALID_OPERATION_ID,
        reservedExpiresAt: new Date(),
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("reservation_expired");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 12. A3.5 already_started -> NO PROVIDER REDISPATCH
  it("12. A3.5 already_started -> NO PROVIDER REDISPATCH", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "already_started",
        operationId: VALID_OPERATION_ID,
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("already_started");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 13. A3.5 already_finalized -> NO PROVIDER REDISPATCH
  it("13. A3.5 already_finalized -> NO PROVIDER REDISPATCH", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "already_finalized",
        operationId: VALID_OPERATION_ID,
        existingStatus: "completed_success",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("already_finalized");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 14. A3.5 control_unavailable -> no provider
  it("14. A3.5 control_unavailable -> no provider", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("control_unavailable");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
    expect(h.quotaCoordinator.releaseReservation).not.toHaveBeenCalled();
  });

  // 15. started -> provider called exactly once AFTER boundary resolves
  it("15. started -> provider called exactly once AFTER boundary resolves", async () => {
    const h = createMockHarness();
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(true);
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);

    // Verify strict invocation ordering: boundary started THEN provider called
    const boundaryIdx = h.callOrder.indexOf("providerBoundaryCoordinator.beginProviderDispatch");
    const providerIdx = h.callOrder.indexOf("providerPort.generateStructuredOutput");
    const commitIdx = h.callOrder.indexOf("quotaCoordinator.commitSuccessWithLease");
    const leaseReleaseIdx = h.callOrder.indexOf("providerBoundaryCoordinator.releaseConcurrencyLease");

    expect(boundaryIdx).toBeGreaterThan(-1);
    expect(providerIdx).toBeGreaterThan(boundaryIdx);
    expect(commitIdx).toBeGreaterThan(providerIdx);
    expect(leaseReleaseIdx).toBeGreaterThan(commitIdx);
  });

  // 16. provider transport failure -> provider called once -> outcome_unknown finalizer
  it("16. provider transport failure -> provider called once -> outcome_unknown finalizer", async () => {
    const h = createMockHarness({
      providerThrow: new Error("Network timeout contacting OpenAI"),
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_transport_failure");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "outcome_unknown",
      "lease-123"
    );
  });

  // 17. schema validation failure -> completed_validation_failure
  it("17. schema validation failure -> completed_validation_failure", async () => {
    const h = createMockHarness({
      providerResult: {
        ok: true,
        payload: { invalid: "missing all required schema fields" },
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("validation_failure");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "completed_validation_failure",
      "lease-123"
    );
  });

  // 18. grounding failure -> completed_grounding_failure
  it("18. grounding failure -> completed_grounding_failure", async () => {
    const h = createMockHarness({
      groundingResult: false,
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("grounding_failure");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "completed_grounding_failure",
      "lease-123"
    );
  });

  // 19. success -> commitSuccessWithLease
  it("19. success -> commitSuccessWithLease", async () => {
    const h = createMockHarness();
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(true);
    expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledWith(VALID_OPERATION_ID, "lease-123");
    if (result.ok) {
      expect(result.operationId).toBe(VALID_OPERATION_ID);
      expect(result.interpretation.summary).toBe(validInterpretationPayload.summary);
    }
  });

  // 20. same finalizer first attempt control_unavailable, second succeeds -> no provider retry
  it("20. same finalizer first attempt control_unavailable, second succeeds -> no provider retry", async () => {
    let attempt = 0;
    const h = createMockHarness();
    vi.mocked(h.quotaCoordinator.commitSuccessWithLease).mockImplementation(async () => {
      attempt++;
      if (attempt === 1) {
        return {
          kind: "control_unavailable",
          reason: "usage_control_unavailable",
        };
      }
      return {
        kind: "finalized",
        operationId: VALID_OPERATION_ID,
        status: "completed_success",
        userQuotaStatus: "committed",
        platformCostStatus: "assumed_incurred",
        units: 1,
      };
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(true);
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1); // Provider called only ONCE
    expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(2);
    expect(h.sleep).toHaveBeenCalledWith(50);
  });

  // 21. same finalizer acknowledgement ambiguity, second returns already_finalized -> treated as successful confirmation
  it("21. same finalizer acknowledgement ambiguity, second returns already_finalized -> treated as successful confirmation", async () => {
    let attempt = 0;
    const h = createMockHarness();
    vi.mocked(h.quotaCoordinator.commitSuccessWithLease).mockImplementation(async () => {
      attempt++;
      if (attempt === 1) {
        return {
          kind: "control_unavailable",
          reason: "usage_control_unavailable",
        };
      }
      return {
        kind: "already_finalized",
        operationId: VALID_OPERATION_ID,
        status: "completed_success",
        userQuotaStatus: "committed",
      };
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(true);
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(2);
  });

  // 22. known success finalizer fails all bounded attempts -> finalization_unavailable -> never outcome_unknown -> provider called once
  it("22. known success finalizer fails all bounded attempts -> finalization_unavailable -> never outcome_unknown -> provider called once", async () => {
    const h = createMockHarness();
    vi.mocked(h.quotaCoordinator.commitSuccessWithLease).mockResolvedValue({
      kind: "control_unavailable",
      reason: "usage_control_unavailable",
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("finalization_unavailable");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(3); // 3 bounded attempts
    expect(h.quotaCoordinator.markPolicyPendingWithLease).not.toHaveBeenCalled(); // NEVER downgraded to outcome_unknown
  });

  // 23. known validation failure finalizer fails -> never outcome_unknown
  it("23. known validation failure finalizer fails -> never outcome_unknown", async () => {
    const h = createMockHarness({
      providerResult: {
        ok: true,
        payload: { invalid: "malformed" },
      },
    });
    vi.mocked(h.quotaCoordinator.markPolicyPendingWithLease).mockResolvedValue({
      kind: "control_unavailable",
      reason: "usage_control_unavailable",
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("finalization_unavailable");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(3);
    // Verified: all 3 attempts were for "completed_validation_failure", NEVER outcome_unknown
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "completed_validation_failure",
      "lease-123"
    );
  });

  // 24. known grounding failure finalizer fails -> never outcome_unknown
  it("24. known grounding failure finalizer fails -> never outcome_unknown", async () => {
    const h = createMockHarness({
      groundingResult: false,
    });
    vi.mocked(h.quotaCoordinator.markPolicyPendingWithLease).mockResolvedValue({
      kind: "control_unavailable",
      reason: "usage_control_unavailable",
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("finalization_unavailable");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(3);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "completed_grounding_failure",
      "lease-123"
    );
  });

  // 25. lease release called in finally after started
  it("25. lease release called in finally after started", async () => {
    const h = createMockHarness();
    await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(h.providerBoundaryCoordinator.releaseConcurrencyLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID
    );
  });

  // 26. lease release failure does not rewrite terminal result
  it("26. lease release failure does not rewrite terminal result", async () => {
    const h = createMockHarness({
      leaseReleaseResult: {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      },
    });
    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    // Terminal result is STILL success even though lease release failed
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.operationId).toBe(VALID_OPERATION_ID);
    }
  });

  // 27. provider never called before A3.5 started
  it("27. provider never called before A3.5 started", async () => {
    let providerCalledBeforeStarted = false;
    let startedResolved = false;

    const h = createMockHarness();
    vi.mocked(h.providerBoundaryCoordinator.beginProviderDispatch).mockImplementation(async () => {
      // Simulate delay in boundary resolution
      await new Promise((r) => setTimeout(r, 10));
      startedResolved = true;
      return {
        kind: "started",
        operationId: VALID_OPERATION_ID,
        leaseId: "00000000-0000-0000-0000-000000000003",
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        dispatchStartedAt: new Date(),
      };
    });

    vi.mocked(h.providerPort.generateStructuredOutput).mockImplementation(async () => {
      if (!startedResolved) {
        providerCalledBeforeStarted = true;
      }
      return {
        ok: true,
        payload: validInterpretationPayload,
      };
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(true);
    expect(providerCalledBeforeStarted).toBe(false);
  });

  // 28. invalid runtime timeout > 30000 -> fail closed before provider execution
  it("28. invalid runtime timeout > 30000 -> fail closed during construction", () => {
    expect(() => {
      createMockHarness({
        providerTimeoutMs: FROZEN_HERMES_MAX_PROVIDER_TIMEOUT_MS + 1000,
      });
    }).toThrow(/exceeds frozen maximum/);
  });

  // 29. no raw Idempotency-Key in diagnostics
  it("29. no raw Idempotency-Key in diagnostics", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const h = createMockHarness({
        providerThrow: new Error("Simulated failure with diagnostic check"),
      });

      await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      const allLoggedMessages = [
        ...consoleSpy.mock.calls.flat(),
        ...infoSpy.mock.calls.flat(),
        ...warnSpy.mock.calls.flat(),
      ].map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)));

      for (const msg of allLoggedMessages) {
        expect(msg).not.toContain(VALID_UUID);
      }
    } finally {
      consoleSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  // 30. no production unsafe casts / strict typing
  it("30. rejects invalid non-UUID idempotency key directly", async () => {
    const h = createMockHarness();
    const result = await h.service.executeJurisprudenceInterpretation({
      ...h.defaultInput,
      idempotencyKey: "not-a-valid-uuid",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("idempotency_key_invalid");
    }
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 31. capacity limits validation fail-closed during construction
  it("31. capacity limits validation fail-closed during construction", () => {
    // missing limits tested safely via readHermesRuntimeLimitsConfig without unsafe cast
    expect(() => {
      readHermesRuntimeLimitsConfig({});
    }).toThrow(/HERMES_CONCURRENCY_LIMIT is required/);

    // non-positive concurrencyLimit
    expect(() => {
      createMockHarness({
        limits: { concurrencyLimit: 0, dailyProviderCallLimit: 1000, leaseTtlSeconds: 75 },
      });
    }).toThrow(/concurrencyLimit must be an explicit positive/);

    // non-positive dailyProviderCallLimit
    expect(() => {
      createMockHarness({
        limits: { concurrencyLimit: 10, dailyProviderCallLimit: -5, leaseTtlSeconds: 75 },
      });
    }).toThrow(/dailyProviderCallLimit must be an explicit positive/);

    // non-integer
    expect(() => {
      createMockHarness({
        limits: { concurrencyLimit: 10.5, dailyProviderCallLimit: 1000, leaseTtlSeconds: 75 },
      });
    }).toThrow(/concurrencyLimit must be an explicit positive/);
  });

  // 32. fresh expiry clock: coordinator expireReservation invoked without stale request timestamp
  it("32. fresh expiry clock: coordinator expireReservation invoked without stale request timestamp", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "reservation_expired",
        operationId: VALID_OPERATION_ID,
        reservedExpiresAt: new Date(Date.now() - 5000),
      },
    });

    const expireSpy = vi.mocked(h.quotaCoordinator.expireReservation);

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("reservation_expired");
    }

    expect(expireSpy).toHaveBeenCalledTimes(1);
    // Crucial: expireReservation(operationId) called WITHOUT second argument (stale referenceNow),
    // allowing coordinator's own trusted fresh clock to own reference time
    expect(expireSpy).toHaveBeenCalledWith(VALID_OPERATION_ID);
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 33. provider throws -> markPolicyPendingWithLease(outcome_unknown) succeeds -> provider_transport_failure
  it("33. provider throws -> markPolicyPendingWithLease(outcome_unknown) succeeds -> provider_transport_failure, exactly 1 provider call", async () => {
    const h = createMockHarness({
      providerThrow: new Error("Network drop during stream"),
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_transport_failure");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "outcome_unknown",
      "lease-123"
    );
  });

  // 34. provider throws -> markPolicyPendingWithLease fails 3 times -> finalization_unavailable (providerOutcomeKnown: false)
  it("34. provider throws -> markPolicyPendingWithLease returns control_unavailable 3 times -> finalization_unavailable (providerOutcomeKnown: false)", async () => {
    const h = createMockHarness({
      providerThrow: new Error("Network drop during stream"),
      markPolicyPendingResult: {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      },
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("finalization_unavailable");
      if (result.code === "finalization_unavailable") {
        expect(result.targetStatus).toBe("outcome_unknown");
        expect(result.providerOutcomeKnown).toBe(false);
        expect(result.operationId).toBe(VALID_OPERATION_ID);
      }
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(3);
  });

  // 35. provider ok:false -> markPolicyPendingWithLease(outcome_unknown) succeeds -> provider_transport_failure
  it("35. provider ok:false -> markPolicyPendingWithLease(outcome_unknown) succeeds -> provider_transport_failure, exactly 1 provider call", async () => {
    const h = createMockHarness({
      providerResult: {
        ok: false,
        error: { code: "unknown_provider_failure", isRetryable: false },
      },
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("provider_transport_failure");
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
      VALID_OPERATION_ID,
      "outcome_unknown",
      "lease-123"
    );
  });

  // 36. provider ok:false -> markPolicyPendingWithLease fails 3 times -> finalization_unavailable (providerOutcomeKnown: false)", async () => {
  it("36. provider ok:false -> markPolicyPendingWithLease returns control_unavailable 3 times -> finalization_unavailable (providerOutcomeKnown: false)", async () => {
    const h = createMockHarness({
      providerResult: {
        ok: false,
        error: { code: "unknown_provider_failure", isRetryable: false },
      },
      markPolicyPendingResult: {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      },
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("finalization_unavailable");
      if (result.code === "finalization_unavailable") {
        expect(result.targetStatus).toBe("outcome_unknown");
        expect(result.providerOutcomeKnown).toBe(false);
        expect(result.operationId).toBe(VALID_OPERATION_ID);
      }
    }
    expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(3);
  });

  // 37. boundary control_unavailable does NOT issue releaseReservation
  it("37. boundary control_unavailable does NOT issue releaseReservation", async () => {
    const h = createMockHarness({
      boundaryResult: {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      },
    });

    const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("control_unavailable");
    }
    expect(h.quotaCoordinator.releaseReservation).not.toHaveBeenCalled();
    expect(h.providerPort.generateStructuredOutput).not.toHaveBeenCalled();
  });

  // 38. strict env integer syntax for capacity limits (Section 3 & Section 8)
  it("38. strict env integer syntax fail-closed rejection for capacity limits", () => {
    // missing concurrency
    expect(() => readHermesRuntimeLimitsConfig({})).toThrow(
      /HERMES_CONCURRENCY_LIMIT is required/
    );
    // missing daily
    expect(() =>
      readHermesRuntimeLimitsConfig({ HERMES_CONCURRENCY_LIMIT: "10" })
    ).toThrow(/HERMES_DAILY_PROVIDER_CALL_LIMIT is required/);

    // capacity env zero
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "0",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "0",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env leading zero
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "01",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "005",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env exponent notation
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "1e3",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1E4",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env whitespace padded
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: " 10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10 ",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: " 1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000 ",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env decimal
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "1.0",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "100.5",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env signs
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "+10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "-10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env special strings
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "Infinity",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "NaN",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/must be a canonical positive decimal integer/);

    // capacity env > Number.MAX_SAFE_INTEGER
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "9007199254740992",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      })
    ).toThrow(/explicit positive safe integer/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "9007199254740992",
      })
    ).toThrow(/explicit positive safe integer/);

    // canonical valid env returns parsed limits
    const validConfig = readHermesRuntimeLimitsConfig({
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
    });
    expect(validConfig).toEqual({
      concurrencyLimit: 10,
      dailyProviderCallLimit: 1000,
      leaseTtlSeconds: DEFAULT_HERMES_LEASE_TTL_SECONDS,
      reservationTtlSeconds: DEFAULT_HERMES_RESERVATION_TTL_SECONDS,
    });
  });

  // 39. strict env lease syntax and range validation (Section 3, 6, 8)
  it("39. strict env lease syntax and range validation", () => {
    // lease env malformed syntax: leading zero
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "075",
      })
    ).toThrow(/canonical positive decimal integer string/);

    // lease env malformed syntax: whitespace padded
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: " 75",
      })
    ).toThrow(/canonical positive decimal integer string/);
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "75 ",
      })
    ).toThrow(/canonical positive decimal integer string/);

    // lease env malformed syntax: exponent notation
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "1e2",
      })
    ).toThrow(/canonical positive decimal integer string/);

    // lease env malformed syntax: decimal
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "75.0",
      })
    ).toThrow(/canonical positive decimal integer string/);

    // lease env malformed syntax: signs
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "+75",
      })
    ).toThrow(/canonical positive decimal integer string/);

    // lease env range: < 60
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "59",
      })
    ).toThrow(/between 60 and 90/);

    // lease env range: > 90
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "91",
      })
    ).toThrow(/between 60 and 90/);

    // canonical valid lease env
    const validWithLease = readHermesRuntimeLimitsConfig({
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "80",
    });
    expect(validWithLease.leaseTtlSeconds).toBe(80);
    expect(validWithLease.reservationTtlSeconds).toBe(DEFAULT_HERMES_RESERVATION_TTL_SECONDS);
  });

  // 40. injected capacity limits safe integer rejection (Section 2 & Section 8)
  it("40. injected capacity limits safe integer rejection during construction", () => {
    // capacity numeric > Number.MAX_SAFE_INTEGER
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: Number.MAX_SAFE_INTEGER + 1,
          dailyProviderCallLimit: 1000,
          leaseTtlSeconds: 75,
        },
      })
    ).toThrow(/concurrencyLimit must be an explicit positive/);

    // daily numeric > Number.MAX_SAFE_INTEGER
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: Number.MAX_SAFE_INTEGER + 1,
          leaseTtlSeconds: 75,
        },
      })
    ).toThrow(/dailyProviderCallLimit must be an explicit positive/);

    // fractional daily
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: 1000.5,
          leaseTtlSeconds: 75,
        },
      })
    ).toThrow(/dailyProviderCallLimit must be an explicit positive/);
  });

  // 41. injected lease TTL safe integer validation (Section 6 & Section 8)
  it("41. injected lease TTL safe integer validation during construction", () => {
    // lease injected fractional value
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: 1000,
          leaseTtlSeconds: 75.5,
        },
      })
    ).toThrow(/leaseTtlSeconds must be an integer between 60 and 90/);

    // lease injected unsafe integer
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: 1000,
          leaseTtlSeconds: Number.MAX_SAFE_INTEGER + 1,
        },
      })
    ).toThrow(/leaseTtlSeconds must be an integer between 60 and 90/);

    // lease injected < 60
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: 1000,
          leaseTtlSeconds: 59,
        },
      })
    ).toThrow(/leaseTtlSeconds must be an integer between 60 and 90/);

    // lease injected > 90
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: 10,
          dailyProviderCallLimit: 1000,
          leaseTtlSeconds: 91,
        },
      })
    ).toThrow(/leaseTtlSeconds must be an integer between 60 and 90/);
  });

  // 42. reservation TTL domain validation (Section 4 & Section 8)
  it("42. reservation TTL domain validation during construction", () => {
    // reservation TTL < 90
    expect(() =>
      createMockHarness({
        reservationTtlSeconds: 89,
      })
    ).toThrow(/reservationTtlSeconds must be an integer between 90 and 120/);

    // reservation TTL > 120
    expect(() =>
      createMockHarness({
        reservationTtlSeconds: 121,
      })
    ).toThrow(/reservationTtlSeconds must be an integer between 90 and 120/);

    // reservation TTL fractional
    expect(() =>
      createMockHarness({
        reservationTtlSeconds: 105.5,
      })
    ).toThrow(/reservationTtlSeconds must be an integer between 90 and 120/);

    // reservation TTL unsafe integer
    expect(() =>
      createMockHarness({
        reservationTtlSeconds: Number.MAX_SAFE_INTEGER + 1,
      })
    ).toThrow(/reservationTtlSeconds must be an integer between 90 and 120/);

    // reservation TTL <= leaseTTL + 15
    // Case A: default lease (75), reservationTtlSeconds = 90 (75 + 15 = 90)
    expect(() =>
      createMockHarness({
        limits: { concurrencyLimit: 10, dailyProviderCallLimit: 1000, leaseTtlSeconds: 75 },
        reservationTtlSeconds: 90,
      })
    ).toThrow(/must be strictly greater than leaseTtlSeconds \(75\) \+ 15/);

    // Case B: lease = 90, reservationTtlSeconds = 105 (90 + 15 = 105)
    expect(() =>
      createMockHarness({
        limits: { concurrencyLimit: 10, dailyProviderCallLimit: 1000, leaseTtlSeconds: 90 },
        reservationTtlSeconds: 105,
      })
    ).toThrow(/must be strictly greater than leaseTtlSeconds \(90\) \+ 15/);

    // Case C: lease = 90, reservationTtlSeconds = 100 (100 <= 90 + 15)
    expect(() =>
      createMockHarness({
        limits: { concurrencyLimit: 10, dailyProviderCallLimit: 1000, leaseTtlSeconds: 90 },
        reservationTtlSeconds: 100,
      })
    ).toThrow(/must be strictly greater than leaseTtlSeconds \(90\) \+ 15/);

    // Valid canonical reservation TTL
    expect(() =>
      createMockHarness({
        limits: { concurrencyLimit: 10, dailyProviderCallLimit: 1000, leaseTtlSeconds: 90 },
        reservationTtlSeconds: 110,
      })
    ).not.toThrow();

    // Default reservation TTL (105) with default lease (75) works (105 > 75 + 15)
    expect(() => createMockHarness()).not.toThrow();
  });

  // 43. finalizer attempt validation (Section 5 & Section 8)
  it("43. finalizer attempt validation during construction", () => {
    // maxFinalizerAttempts = 0
    expect(() =>
      createMockHarness({
        maxFinalizerAttempts: 0,
      })
    ).toThrow(/maxFinalizerAttempts must be an integer between 1 and 3/);

    // maxFinalizerAttempts negative
    expect(() =>
      createMockHarness({
        maxFinalizerAttempts: -1,
      })
    ).toThrow(/maxFinalizerAttempts must be an integer between 1 and 3/);

    // maxFinalizerAttempts = 4
    expect(() =>
      createMockHarness({
        maxFinalizerAttempts: 4,
      })
    ).toThrow(/maxFinalizerAttempts must be an integer between 1 and 3/);

    // maxFinalizerAttempts fractional
    expect(() =>
      createMockHarness({
        maxFinalizerAttempts: 2.5,
      })
    ).toThrow(/maxFinalizerAttempts must be an integer between 1 and 3/);

    // maxFinalizerAttempts unsafe integer
    expect(() =>
      createMockHarness({
        maxFinalizerAttempts: Number.MAX_SAFE_INTEGER + 1,
      })
    ).toThrow(/maxFinalizerAttempts must be an integer between 1 and 3/);

    // Valid canonical values 1, 2, 3
    expect(() => createMockHarness({ maxFinalizerAttempts: 1 })).not.toThrow();
    expect(() => createMockHarness({ maxFinalizerAttempts: 2 })).not.toThrow();
    expect(() => createMockHarness({ maxFinalizerAttempts: 3 })).not.toThrow();
  });

  // 44. reservation TTL environment configuration validation (HERMES-PROD-A3.6B-R3)
  it("44. reservation TTL environment configuration validation", () => {
    // A. reservation env absent -> 105 default
    const configDefault = readHermesRuntimeLimitsConfig({
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
    });
    expect(configDefault.reservationTtlSeconds).toBe(105);
    expect(readHermesReservationTtlConfig({})).toBe(105);

    // B. reservation env = "110" -> 110
    const config110 = readHermesRuntimeLimitsConfig({
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_RESERVATION_TTL_SECONDS: "110",
    });
    expect(config110.reservationTtlSeconds).toBe(110);
    expect(
      readHermesReservationTtlConfig({ HERMES_RESERVATION_TTL_SECONDS: "110" })
    ).toBe(110);

    // C. reservation env = "106" with lease = "90" -> valid runtime config
    const config106With90 = readHermesRuntimeLimitsConfig({
      HERMES_CONCURRENCY_LIMIT: "10",
      HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
      HERMES_CONCURRENCY_LEASE_TTL_SECONDS: "90",
      HERMES_RESERVATION_TTL_SECONDS: "106",
    });
    expect(config106With90.leaseTtlSeconds).toBe(90);
    expect(config106With90.reservationTtlSeconds).toBe(106);

    // D. lease = "90" reservation absent/default 105 -> runtime construction fails closed
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: configDefault.concurrencyLimit,
          dailyProviderCallLimit: configDefault.dailyProviderCallLimit,
          leaseTtlSeconds: 90,
        },
        reservationTtlSeconds: configDefault.reservationTtlSeconds, // 105
      })
    ).toThrow(/must be strictly greater than leaseTtlSeconds \(90\) \+ 15/);

    // E. lease = "90" reservation = "110" -> runtime construction succeeds
    expect(() =>
      createMockHarness({
        limits: {
          concurrencyLimit: config110.concurrencyLimit,
          dailyProviderCallLimit: config110.dailyProviderCallLimit,
          leaseTtlSeconds: 90,
        },
        reservationTtlSeconds: config110.reservationTtlSeconds, // 110
      })
    ).not.toThrow();

    // F. reservation env malformed syntax: rejected
    const malformedCases = [
      "",
      "0",
      "-1",
      "+105",
      "0105",
      "105.0",
      "1e2",
      " 105",
      "105 ",
      "Infinity",
      "NaN",
    ];
    for (const malformed of malformedCases) {
      expect(() =>
        readHermesRuntimeLimitsConfig({
          HERMES_CONCURRENCY_LIMIT: "10",
          HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
          HERMES_RESERVATION_TTL_SECONDS: malformed,
        })
      ).toThrow(/must be a canonical positive decimal integer string/);

      expect(() =>
        readHermesReservationTtlConfig({
          HERMES_RESERVATION_TTL_SECONDS: malformed,
        })
      ).toThrow(/must be a canonical positive decimal integer string/);
    }

    // G. reservation = "89" -> rejected
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_RESERVATION_TTL_SECONDS: "89",
      })
    ).toThrow(/between 90 and 120/);

    // H. reservation = "121" -> rejected
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_RESERVATION_TTL_SECONDS: "121",
      })
    ).toThrow(/between 90 and 120/);

    // I. reservation > Number.MAX_SAFE_INTEGER -> rejected
    expect(() =>
      readHermesRuntimeLimitsConfig({
        HERMES_CONCURRENCY_LIMIT: "10",
        HERMES_DAILY_PROVIDER_CALL_LIMIT: "1000",
        HERMES_RESERVATION_TTL_SECONDS: "9007199254740992",
      })
    ).toThrow(/between 90 and 120/);
  });

  // ============================================================
  // HERMES-PROD-A3.7B: Worker Finalization Fencing Foundation (Runtime Execution)
  // ============================================================
  describe("HERMES-PROD-A3.7B: Worker Finalization Fencing Foundation (Runtime Execution)", () => {
    // 16. beginProviderDispatch.started leaseId reaches commitSuccessWithLease
    it("16. beginProviderDispatch.started leaseId reaches commitSuccessWithLease", async () => {
      const h = createMockHarness();
      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(true);
      expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledWith(
        VALID_OPERATION_ID,
        "lease-123"
      );
    });

    // 17. leaseId reaches validation failure finalizer
    it("17. leaseId reaches validation failure finalizer", async () => {
      const h = createMockHarness({
        providerResult: {
          ok: true,
          payload: { invalid: "payload" },
        },
      });
      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
        VALID_OPERATION_ID,
        "completed_validation_failure",
        "lease-123"
      );
    });

    // 18. leaseId reaches grounding failure finalizer
    it("18. leaseId reaches grounding failure finalizer", async () => {
      const h = createMockHarness({
        groundingResult: false,
      });
      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
        VALID_OPERATION_ID,
        "completed_grounding_failure",
        "lease-123"
      );
    });

    // 19. leaseId reaches provider transport outcome_unknown finalizer
    it("19. leaseId reaches provider transport outcome_unknown finalizer", async () => {
      const h = createMockHarness({
        providerThrow: new Error("Transport error"),
      });
      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledWith(
        VALID_OPERATION_ID,
        "outcome_unknown",
        "lease-123"
      );
    });

    // 20. lease_authority_lost after known success -> finalization_unavailable -> providerOutcomeKnown true -> NEVER outcome_unknown fallback
    it("20. lease_authority_lost after known success -> finalization_unavailable -> providerOutcomeKnown true -> NEVER outcome_unknown fallback", async () => {
      const h = createMockHarness({
        commitSuccessResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("finalization_unavailable");
        if (result.code === "finalization_unavailable") {
          expect(result.targetStatus).toBe("completed_success");
          expect(result.providerOutcomeKnown).toBe(true);
          expect(result.operationId).toBe(VALID_OPERATION_ID);
        }
      }
      // Never retried and never downgraded to outcome_unknown
      expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(1);
      expect(h.quotaCoordinator.markPolicyPendingWithLease).not.toHaveBeenCalled();
      expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    });

    // 21. lease_authority_lost after validation failure -> finalization_unavailable -> providerOutcomeKnown true
    it("21. lease_authority_lost after validation failure -> finalization_unavailable -> providerOutcomeKnown true", async () => {
      const h = createMockHarness({
        providerResult: {
          ok: true,
          payload: { invalid: "payload" },
        },
        markPolicyPendingResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("finalization_unavailable");
        if (result.code === "finalization_unavailable") {
          expect(result.targetStatus).toBe("completed_validation_failure");
          expect(result.providerOutcomeKnown).toBe(true);
        }
      }
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(1);
    });

    // 22. lease_authority_lost after grounding failure -> finalization_unavailable -> providerOutcomeKnown true
    it("22. lease_authority_lost after grounding failure -> finalization_unavailable -> providerOutcomeKnown true", async () => {
      const h = createMockHarness({
        groundingResult: false,
        markPolicyPendingResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("finalization_unavailable");
        if (result.code === "finalization_unavailable") {
          expect(result.targetStatus).toBe("completed_grounding_failure");
          expect(result.providerOutcomeKnown).toBe(true);
        }
      }
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(1);
    });

    // 23. lease_authority_lost during transport-unknown finalizer -> finalization_unavailable -> target outcome_unknown -> providerOutcomeKnown false
    it("23. lease_authority_lost during transport-unknown finalizer -> finalization_unavailable -> target outcome_unknown -> providerOutcomeKnown false", async () => {
      const h = createMockHarness({
        providerThrow: new Error("Transport socket hangup"),
        markPolicyPendingResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("finalization_unavailable");
        if (result.code === "finalization_unavailable") {
          expect(result.targetStatus).toBe("outcome_unknown");
          expect(result.providerOutcomeKnown).toBe(false);
        }
      }
      expect(h.quotaCoordinator.markPolicyPendingWithLease).toHaveBeenCalledTimes(1);
    });

    // 24. provider called exactly once (even on lease_authority_lost)
    it("24. provider called exactly once", async () => {
      const h = createMockHarness({
        commitSuccessResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      await h.service.executeJurisprudenceInterpretation(h.defaultInput);
      expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    });

    // 25. provider never called from DB finalizer retries
    it("25. provider never called from DB finalizer retries", async () => {
      let attempts = 0;
      const h = createMockHarness();
      vi.mocked(h.quotaCoordinator.commitSuccessWithLease).mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return { kind: "control_unavailable", reason: "usage_control_unavailable" };
        }
        return {
          kind: "finalized",
          operationId: VALID_OPERATION_ID,
          status: "completed_success",
          userQuotaStatus: "committed",
          platformCostStatus: "assumed_incurred",
          units: 1,
        };
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);
      expect(result.ok).toBe(true);
      expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
      expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(3);
    });

    // 26. releaseConcurrencyLease still executes finally
    it("26. releaseConcurrencyLease still executes finally even after lease_authority_lost", async () => {
      const h = createMockHarness({
        commitSuccessResult: {
          kind: "lease_authority_lost",
          operationId: VALID_OPERATION_ID,
        },
      });

      await h.service.executeJurisprudenceInterpretation(h.defaultInput);
      expect(h.providerBoundaryCoordinator.releaseConcurrencyLease).toHaveBeenCalledWith(
        VALID_OPERATION_ID
      );
    });

    // 29. ack-loss: first finalizer logically commits, retry same target after lease loss -> already_finalized
    it("29. ack-loss: first finalizer logically commits, retry same target returns already_finalized -> execution succeeds", async () => {
      let callCount = 0;
      const h = createMockHarness();
      vi.mocked(h.quotaCoordinator.commitSuccessWithLease).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Attempt 1: socket drop simulated after commit
          return { kind: "control_unavailable", reason: "usage_control_unavailable" };
        }
        // Attempt 2: returns already_finalized from DB idempotency check
        return {
          kind: "already_finalized",
          operationId: VALID_OPERATION_ID,
          status: "completed_success",
          userQuotaStatus: "committed",
        };
      });

      const result = await h.service.executeJurisprudenceInterpretation(h.defaultInput);
      expect(result.ok).toBe(true);
      expect(h.quotaCoordinator.commitSuccessWithLease).toHaveBeenCalledTimes(2);
      expect(h.providerPort.generateStructuredOutput).toHaveBeenCalledTimes(1);
    });
  });
});
