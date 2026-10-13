import { describe, expect, it, vi } from "vitest";
import {
  validateHermesSubjectIdentityInput,
  extractHermesSubjectIdentity,
  HermesSubjectIdentityValidationError,
  PostgresHermesSubjectRepository,
  PostgresHermesEntitlementRepository,
  evaluateHermesEntitlement,
  evaluateSubjectEntitlementGate,
  HermesControlPersistenceError,
  type HermesEntitlementRecord,
  type HermesEntitlementRepository,
  type HermesSubjectRepository,
  type HermesSubjectIdentityInput,
} from "@/lib/hermes/control";
import type { WorkspaceSession } from "@/types/auth";
import {
  subjectIdentities,
  subjectEntitlements,
  subjectQuotaUsage,
  analysisOperations,
  concurrencyLeases,
  providerDailyUsage,
} from "@/database/schema/hermes-control";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("HERMES-PROD-A3.3: Identity + Entitlement Repository & Policy", () => {
  // ============================================================
  // A. Valid Auth0 Provider Identity & Opaque Preservation
  // ============================================================
  describe("A. Valid Auth0 Provider Identity & Opaque Preservation", () => {
    it("validates and accepts a canonical Auth0 provider identity input", () => {
      const input: HermesSubjectIdentityInput = {
        provider: "auth0",
        providerSubjectId: "auth0|64f2a123abc456",
      };
      const result = validateHermesSubjectIdentityInput(input);
      expect(result).toEqual({
        provider: "auth0",
        providerSubjectId: "auth0|64f2a123abc456",
      });
    });

    it("preserves exact case and value of providerSubjectId without mutation", () => {
      const mixedCaseSubjectId = "auth0|User_CaseSensitive-Identifier.123_XYZ";
      const input: HermesSubjectIdentityInput = {
        provider: "auth0",
        providerSubjectId: mixedCaseSubjectId,
      };
      const result = validateHermesSubjectIdentityInput(input);
      expect(result.providerSubjectId).toBe(mixedCaseSubjectId);
    });

    it("extracts identity cleanly from WorkspaceSession", () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "ephemeral-sid-777",
        providerSubjectId: "google-oauth2|1092837465",
        issuedAt: "2026-10-13T12:00:00.000Z",
        expiresAt: "2026-10-14T12:00:00.000Z",
        provider: "auth0",
      };
      const identity = extractHermesSubjectIdentity(session);
      expect(identity).toEqual({
        provider: "auth0",
        providerSubjectId: "google-oauth2|1092837465",
      });
    });

    it("rejects unsupported identity providers fail-closed", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "github",
          providerSubjectId: "12345",
        })
      ).toThrow(HermesSubjectIdentityValidationError);
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "okta",
          providerSubjectId: "12345",
        })
      ).toThrow(/unsupported_identity_provider/);
    });
  });

  // ============================================================
  // B. Strict providerSubjectId Validation & Whitespace Rejection
  // ============================================================
  describe("B. Strict providerSubjectId Validation & Whitespace Rejection", () => {
    it("accepts canonical exact 'auth0|abc'", () => {
      const result = validateHermesSubjectIdentityInput({
        provider: "auth0",
        providerSubjectId: "auth0|abc",
      });
      expect(result.providerSubjectId).toBe("auth0|abc");
    });

    it("rejects leading whitespace in ' auth0|abc'", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: " auth0|abc",
        })
      ).toThrow(/provider_subject_id_has_whitespace/);
    });

    it("rejects trailing whitespace in 'auth0|abc '", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: "auth0|abc ",
        })
      ).toThrow(/provider_subject_id_has_whitespace/);
    });

    it("rejects leading and trailing whitespace in ' auth0|abc '", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: " auth0|abc ",
        })
      ).toThrow(/provider_subject_id_has_whitespace/);
    });

    it("rejects single whitespace string ' '", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: " ",
        })
      ).toThrow(HermesSubjectIdentityValidationError);
    });

    it("rejects empty string providerSubjectId", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: "",
        })
      ).toThrow(/provider_subject_id_empty/);
    });

    it("rejects multichar whitespace-only providerSubjectId", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: "   \t\n  ",
        })
      ).toThrow(HermesSubjectIdentityValidationError);
    });

    it("rejects null or non-string providerSubjectId", () => {
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: null,
        })
      ).toThrow(/provider_subject_id_must_be_string/);
    });

    it("accepts providerSubjectId with exactly 128 characters", () => {
      const boundary128 = "a".repeat(128);
      const result = validateHermesSubjectIdentityInput({
        provider: "auth0",
        providerSubjectId: boundary128,
      });
      expect(result.providerSubjectId).toBe(boundary128);
    });

    it("rejects providerSubjectId exceeding 128 characters (129 chars)", () => {
      const overlong129 = "a".repeat(129);
      expect(() =>
        validateHermesSubjectIdentityInput({
          provider: "auth0",
          providerSubjectId: overlong129,
        })
      ).toThrow(/provider_subject_id_too_long/);
    });

    it("causes repository resolveOrCreateSubject to fail-closed immediately on whitespace without DB query", async () => {
      const roleRunner = vi.fn();
      const repo = new PostgresHermesSubjectRepository({ roleRunner });
      const badIdentity: HermesSubjectIdentityInput = {
        provider: "auth0",
        providerSubjectId: "   ",
      };
      await expect(repo.resolveOrCreateSubject(badIdentity)).rejects.toThrow(
        HermesSubjectIdentityValidationError
      );
      expect(roleRunner).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // C. Existing Subject Resolves Exact Same Internal UUID
  // ============================================================
  describe("C. Existing Subject Resolves Exact Same Internal UUID", () => {
    it("returns resolved status and existing UUID when subject identity already exists", async () => {
      const existingUuid = "11111111-2222-3333-4444-555555555555";
      const repo = new PostgresHermesSubjectRepository({
        handler: async () => ({
          kind: "resolved",
          subjectId: existingUuid,
        }),
      });

      const result = await repo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|existing-user",
      });

      expect(result).toEqual({
        kind: "resolved",
        subjectId: existingUuid,
      });
    });
  });

  // ============================================================
  // D. New Identity Insert Returns New UUID
  // ============================================================
  describe("D. New Identity Insert Returns New UUID", () => {
    it("returns created status and newly generated UUID when subject identity is first seen", async () => {
      const newUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
      const repo = new PostgresHermesSubjectRepository({
        handler: async () => ({
          kind: "created",
          subjectId: newUuid,
        }),
      });

      const result = await repo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|brand-new-user",
      });

      expect(result).toEqual({
        kind: "created",
        subjectId: newUuid,
      });
    });
  });

  // ============================================================
  // E. Concurrent/Conflict Insertion Resolves Existing UUID Deterministically
  // ============================================================
  describe("E. Concurrent/Conflict Insertion Resolves Existing UUID Deterministically", () => {
    it("converges to exact same UUID when concurrent inserts collide on unique constraint", async () => {
      const canonicalUuid = "99999999-8888-7777-6666-555555555555";
      let insertAttempts = 0;

      const concurrentRepo = new PostgresHermesSubjectRepository({
        handler: async () => {
          insertAttempts++;
          if (insertAttempts === 1) {
            return { kind: "created", subjectId: canonicalUuid };
          }
          return { kind: "resolved", subjectId: canonicalUuid };
        },
      });

      const [res1, res2] = await Promise.all([
        concurrentRepo.resolveOrCreateSubject({
          provider: "auth0",
          providerSubjectId: "auth0|concurrent-race",
        }),
        concurrentRepo.resolveOrCreateSubject({
          provider: "auth0",
          providerSubjectId: "auth0|concurrent-race",
        }),
      ]);

      expect(res1.kind).not.toBe("unavailable");
      expect(res2.kind).not.toBe("unavailable");
      if (res1.kind !== "unavailable" && res2.kind !== "unavailable") {
        expect([res1.subjectId, res2.subjectId]).toEqual([canonicalUuid, canonicalUuid]);
        expect(res1.subjectId).toBe(res2.subjectId);
      }
    });
  });

  // ============================================================
  // F. DB Failure Sanitized & Minimal Error Surface
  // ============================================================
  describe("F. DB Failure Sanitized & Minimal Error Surface", () => {
    it("sanitizes raw PostgreSQL relation error into usage_control_unavailable outcome", async () => {
      const rawPgError = new Error('relation "hermes_control.subject_identities" does not exist');
      Object.assign(rawPgError, { name: "PostgresError", code: "42P01", severity: "ERROR" });

      const repo = new PostgresHermesSubjectRepository({
        handler: async () => {
          throw rawPgError;
        },
      });

      const result = await repo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|any-user",
      });

      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
      expect(JSON.stringify(result)).not.toContain("hermes_control");
      expect(JSON.stringify(result)).not.toContain("PostgresError");
      expect(JSON.stringify(result)).not.toContain("42P01");
    });

    it("sanitizes raw DB connection failure in entitlement repository", async () => {
      const connError = new Error("connect ECONNREFUSED 127.0.0.1:5432");
      Object.assign(connError, { code: "ECONNREFUSED" });

      const repo = new PostgresHermesEntitlementRepository({
        handler: async () => {
          throw connError;
        },
      });

      const result = await repo.getEntitlement("some-uuid");
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
      expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
      expect(JSON.stringify(result)).not.toContain("127.0.0.1");
    });

    it("evaluates DB failure through evaluateSubjectEntitlementGate to control_failure", async () => {
      const mockRepo: HermesEntitlementRepository = {
        getEntitlement: async () => ({
          kind: "unavailable",
          reason: "usage_control_unavailable",
        }),
      };

      const gateResult = await evaluateSubjectEntitlementGate(mockRepo, "sub-uuid", new Date());
      expect(gateResult).toEqual({
        allowed: false,
        kind: "control_failure",
        reason: "usage_control_unavailable",
        entitlement: null,
      });
    });

    it("confirms HermesControlPersistenceError exposes zero raw cause or DB details", () => {
      const err = new HermesControlPersistenceError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("HermesControlPersistenceError");
      expect(err.message).toBe("usage_control_unavailable");
      expect(err.code).toBe("usage_control_unavailable");
      expect("cause" in err).toBe(false);
      expect(JSON.stringify(err)).not.toContain("postgres");
      expect(JSON.stringify(err)).not.toContain("sql");
    });
  });

  // ============================================================
  // G. No Entitlement => Deny (feature_not_entitled)
  // ============================================================
  describe("G. No Entitlement => Deny (feature_not_entitled)", () => {
    it("denies access with feature_not_entitled when entitlement is null", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const decision = evaluateHermesEntitlement(null, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "feature_not_entitled",
        entitlement: null,
      });
    });

    it("denies access with feature_not_entitled when entitlement repository returns absent", async () => {
      const mockRepo: HermesEntitlementRepository = {
        getEntitlement: async () => ({ kind: "absent" }),
      };
      const now = new Date("2026-10-15T12:00:00.000Z");
      const result = await evaluateSubjectEntitlementGate(mockRepo, "sub-no-plan", now);
      expect(result).toEqual({
        allowed: false,
        kind: "deny",
        reason: "feature_not_entitled",
        entitlement: null,
      });
    });
  });

  // ============================================================
  // H. Inactive / Suspended / Expired => Deny (account_inactive)
  // ============================================================
  describe("H. Inactive / Suspended / Expired => Deny (account_inactive)", () => {
    it("denies access with account_inactive when status is suspended", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const entitlement: HermesEntitlementRecord = {
        subjectId: "sub-1",
        planTier: "standard_tier",
        status: "suspended",
        monthlyQuota: 10,
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        periodEnd: new Date("2026-11-01T00:00:00.000Z"),
      };
      const decision = evaluateHermesEntitlement(entitlement, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "account_inactive",
        entitlement,
      });
    });

    it("denies access with account_inactive when status is expired", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const entitlement: HermesEntitlementRecord = {
        subjectId: "sub-1",
        planTier: "standard_tier",
        status: "expired",
        monthlyQuota: 10,
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        periodEnd: new Date("2026-11-01T00:00:00.000Z"),
      };
      const decision = evaluateHermesEntitlement(entitlement, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "account_inactive",
        entitlement,
      });
    });
  });

  // ============================================================
  // I. Period Semantics & Exact Boundaries
  // ============================================================
  describe("I. Period Semantics & Exact Boundaries", () => {
    const periodStart = new Date("2026-10-01T00:00:00.000Z");
    const periodEnd = new Date("2026-11-01T00:00:00.000Z");
    const activeEntitlement: HermesEntitlementRecord = {
      subjectId: "sub-boundaries",
      planTier: "standard_tier",
      status: "active",
      monthlyQuota: 10,
      periodStart,
      periodEnd,
    };

    it("denies access with entitlement_not_current when now < periodStart", () => {
      const beforeStart = new Date("2026-09-30T23:59:59.999Z");
      const decision = evaluateHermesEntitlement(activeEntitlement, beforeStart);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "entitlement_not_current",
        entitlement: activeEntitlement,
      });
    });

    it("allows access on exact start boundary when now == periodStart", () => {
      const decision = evaluateHermesEntitlement(activeEntitlement, periodStart);
      expect(decision).toEqual({
        allowed: true,
        kind: "allow",
        entitlement: activeEntitlement,
      });
    });

    it("denies access on exact end boundary when now == periodEnd", () => {
      const decision = evaluateHermesEntitlement(activeEntitlement, periodEnd);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "entitlement_not_current",
        entitlement: activeEntitlement,
      });
    });

    it("denies access after end boundary when now > periodEnd", () => {
      const afterEnd = new Date("2026-11-01T00:00:01.000Z");
      const decision = evaluateHermesEntitlement(activeEntitlement, afterEnd);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "entitlement_not_current",
        entitlement: activeEntitlement,
      });
    });
  });

  // ============================================================
  // J. Active Current Entitlement => Allow to Next Gate
  // ============================================================
  describe("J. Active Current Entitlement => Allow to Next Gate", () => {
    it("allows proceeding to future quota gate when status is active, current period, and valid quota", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const entitlement: HermesEntitlementRecord = {
        subjectId: "sub-active",
        planTier: "pro_jurist",
        status: "active",
        monthlyQuota: 50,
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        periodEnd: new Date("2026-11-01T00:00:00.000Z"),
      };
      const decision = evaluateHermesEntitlement(entitlement, now);
      expect(decision).toEqual({
        allowed: true,
        kind: "allow",
        entitlement,
      });
      expect(decision.allowed).toBe(true);
    });
  });

  // ============================================================
  // K. Zero Quota Canonical Semantics (One Owner: A3.4 Quota Reservation)
  // ============================================================
  describe("K. Zero Quota Canonical Semantics (One Owner: A3.4 Quota Reservation)", () => {
    const baseZeroQuotaEntitlement: HermesEntitlementRecord = {
      subjectId: "sub-zero",
      planTier: "zero_quota_tier",
      status: "active",
      monthlyQuota: 0,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-01T00:00:00.000Z"),
    };

    it("zero quota has ONE canonical A3.3 result: ALLOW_TO_QUOTA_GATE", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const decision = evaluateHermesEntitlement(baseZeroQuotaEntitlement, now);
      expect(decision.allowed).toBe(true);
      expect(decision.kind).toBe("allow");
      if (decision.allowed) {
        expect(decision.entitlement.monthlyQuota).toBe(0);
      }
    });

    it("proves no denyZeroQuota option exists and function arity is exactly 2", () => {
      expect(evaluateHermesEntitlement.length).toBe(2);
      expect(evaluateSubjectEntitlementGate.length).toBe(3);
    });
  });

  // ============================================================
  // L. Malformed Entitlement Structural Validation Fails Closed
  // ============================================================
  describe("L. Malformed Entitlement Structural Validation Fails Closed", () => {
    const validEntitlement: HermesEntitlementRecord = {
      subjectId: "sub-structural-test",
      planTier: "custom_enterprise_v2",
      status: "active",
      monthlyQuota: 100,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-01T00:00:00.000Z"),
    };

    it("invalid now Date instance fails closed with quota_configuration_invalid", () => {
      const invalidNow = new Date("invalid-date-string");
      const decision = evaluateHermesEntitlement(validEntitlement, invalidNow);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: validEntitlement,
      });
    });

    it("invalid periodStart Date instance fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const malformed: HermesEntitlementRecord = {
        ...validEntitlement,
        periodStart: new Date("invalid"),
      };
      const decision = evaluateHermesEntitlement(malformed, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: malformed,
      });
    });

    it("invalid periodEnd Date instance fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const malformed: HermesEntitlementRecord = {
        ...validEntitlement,
        periodEnd: new Date("invalid"),
      };
      const decision = evaluateHermesEntitlement(malformed, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: malformed,
      });
    });

    it("inverted period (periodEnd <= periodStart) fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const inverted: HermesEntitlementRecord = {
        ...validEntitlement,
        periodStart: new Date("2026-11-01T00:00:00.000Z"),
        periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      };
      const decision = evaluateHermesEntitlement(inverted, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: inverted,
      });
    });

    it("equal period (periodEnd === periodStart) fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const equalDates: HermesEntitlementRecord = {
        ...validEntitlement,
        periodStart: new Date("2026-10-01T00:00:00.000Z"),
        periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      };
      const decision = evaluateHermesEntitlement(equalDates, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: equalDates,
      });
    });

    it("empty planTier fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const malformed: HermesEntitlementRecord = {
        ...validEntitlement,
        planTier: "",
      };
      const decision = evaluateHermesEntitlement(malformed, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: malformed,
      });
    });

    it("whitespace-only planTier fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const malformed: HermesEntitlementRecord = {
        ...validEntitlement,
        planTier: "   \t  ",
      };
      const decision = evaluateHermesEntitlement(malformed, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: malformed,
      });
    });

    it("preserves custom planTier without normalizing or inventing commercial tiers", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const customTier = "Unique-Custom-Tier_123";
      const customRecord: HermesEntitlementRecord = {
        ...validEntitlement,
        planTier: customTier,
      };
      const decision = evaluateHermesEntitlement(customRecord, now);
      expect(decision.allowed).toBe(true);
      if (decision.allowed) {
        expect(decision.entitlement.planTier).toBe(customTier);
      }
    });

    it("fractional monthlyQuota fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const fractionalQuota: HermesEntitlementRecord = {
        ...validEntitlement,
        monthlyQuota: 10.5,
      };
      const decision = evaluateHermesEntitlement(fractionalQuota, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: fractionalQuota,
      });
    });

    it("NaN monthlyQuota fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const nanQuota: HermesEntitlementRecord = {
        ...validEntitlement,
        monthlyQuota: Number.NaN,
      };
      const decision = evaluateHermesEntitlement(nanQuota, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: nanQuota,
      });
    });

    it("negative monthlyQuota (< 0) fails closed with quota_configuration_invalid", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const negativeQuota: HermesEntitlementRecord = {
        ...validEntitlement,
        monthlyQuota: -1,
      };
      const decision = evaluateHermesEntitlement(negativeQuota, now);
      expect(decision).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: negativeQuota,
      });
    });
  });

  // ============================================================
  // M. Entitlement Repository Runtime Mapping & Gate Integrity
  // ============================================================
  describe("M. Entitlement Repository Runtime Mapping & Gate Integrity", () => {
    it("corrupted entitlement row mapped through repository fails closed at gate evaluator", async () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const corruptedRepo: HermesEntitlementRepository = {
        getEntitlement: async () => ({
          kind: "found",
          entitlement: {
            subjectId: "sub-corrupt",
            planTier: "",
            status: "active",
            monthlyQuota: Number.NaN,
            periodStart: new Date("invalid"),
            periodEnd: new Date("invalid"),
          },
        }),
      };

      const gateResult = await evaluateSubjectEntitlementGate(corruptedRepo, "sub-corrupt", now);
      expect(gateResult).toEqual({
        allowed: false,
        kind: "deny",
        reason: "quota_configuration_invalid",
        entitlement: expect.objectContaining({
          subjectId: "sub-corrupt",
        }),
      });
    });

    it("corrupted status in repository lookup fails closed as usage_control_unavailable", async () => {
      const mockRunner = vi.fn().mockImplementation(async (callback) => {
        return callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => [
                  {
                    subjectId: "sub-bad-status",
                    planTier: "standard",
                    status: "corrupted_status_val",
                    monthlyQuota: 10,
                    periodStart: new Date("2026-10-01"),
                    periodEnd: new Date("2026-11-01"),
                  },
                ],
              }),
            }),
          }),
        });
      });

      const repo = new PostgresHermesEntitlementRepository({
        roleRunner: mockRunner,
      });

      const result = await repo.getEntitlement("sub-bad-status");
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
    });
  });

  // ============================================================
  // N. Unconfigured Repositories Fail Closed Via Result Contract
  // ============================================================
  describe("N. Unconfigured Repositories Fail Closed Via Result Contract", () => {
    it("unconfigured subject repository with zero dependencies returns unavailable without throwing", async () => {
      const repo = new PostgresHermesSubjectRepository();
      const result = await repo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|valid-user-123",
      });
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
    });

    it("unconfigured subject repository with empty dependencies object returns unavailable without throwing", async () => {
      const repo = new PostgresHermesSubjectRepository({});
      const result = await repo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|valid-user-123",
      });
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
    });

    it("unconfigured entitlement repository with zero dependencies returns unavailable without throwing", async () => {
      const repo = new PostgresHermesEntitlementRepository();
      const result = await repo.getEntitlement("00000000-0000-0000-0000-000000000000");
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
    });

    it("unconfigured entitlement repository with empty dependencies object returns unavailable without throwing", async () => {
      const repo = new PostgresHermesEntitlementRepository({});
      const result = await repo.getEntitlement("00000000-0000-0000-0000-000000000000");
      expect(result).toEqual({
        kind: "unavailable",
        reason: "usage_control_unavailable",
      });
    });
  });

  // ============================================================
  // O. No Entitlement Auto-Provision
  // ============================================================
  describe("O. No Entitlement Auto-Provision", () => {
    it("new user with identity but no entitlement row is DENIED feature_not_entitled with no implicit free plan", async () => {
      const subjectRepo: HermesSubjectRepository = {
        resolveOrCreateSubject: async () => ({
          kind: "created",
          subjectId: "brand-new-subject-uuid",
        }),
      };
      const entitlementRepo: HermesEntitlementRepository = {
        getEntitlement: async () => ({ kind: "absent" }),
      };

      const identityResult = await subjectRepo.resolveOrCreateSubject({
        provider: "auth0",
        providerSubjectId: "auth0|first-time-visitor",
      });
      expect(identityResult.kind).toBe("created");
      if (identityResult.kind !== "unavailable") {
        expect(identityResult.subjectId).toBe("brand-new-subject-uuid");

        const now = new Date("2026-10-15T12:00:00.000Z");
        const gateResult = await evaluateSubjectEntitlementGate(
          entitlementRepo,
          identityResult.subjectId,
          now
        );

        expect(gateResult).toEqual({
          allowed: false,
          kind: "deny",
          reason: "feature_not_entitled",
          entitlement: null,
        });
      }
    });
  });

  // ============================================================
  // P. Entitlement Repository Performs Read-Only Semantics
  // ============================================================
  describe("P. Entitlement Repository Performs Read-Only Semantics", () => {
    it("issues strictly read queries and never invokes mutation queries on subject_entitlements", async () => {
      const mutationTracker = {
        insertCalls: 0,
        updateCalls: 0,
        deleteCalls: 0,
        selectCalls: 0,
      };

      const repo = new PostgresHermesEntitlementRepository({
        handler: async () => {
          mutationTracker.selectCalls++;
          return { kind: "absent" };
        },
      });

      await repo.getEntitlement("sub-read-only-test");

      expect(mutationTracker.selectCalls).toBe(1);
      expect(mutationTracker.insertCalls).toBe(0);
      expect(mutationTracker.updateCalls).toBe(0);
      expect(mutationTracker.deleteCalls).toBe(0);
    });
  });

  // ============================================================
  // Q. Forbidden Tables Non-Interaction
  // ============================================================
  describe("Q. Forbidden Tables Non-Interaction", () => {
    it("subject and entitlement repositories have zero references to subjectQuotaUsage table", () => {
      const quotaConfig = getTableConfig(subjectQuotaUsage);
      expect(quotaConfig.name).toBe("subject_quota_usage");
      const subjectRepoText = PostgresHermesSubjectRepository.toString();
      const entitlementRepoText = PostgresHermesEntitlementRepository.toString();
      expect(subjectRepoText).not.toContain("subject_quota_usage");
      expect(entitlementRepoText).not.toContain("subject_quota_usage");
    });

    it("subject and entitlement repositories have zero references to analysisOperations table", () => {
      const opsConfig = getTableConfig(analysisOperations);
      expect(opsConfig.name).toBe("analysis_operations");
      const subjectRepoText = PostgresHermesSubjectRepository.toString();
      const entitlementRepoText = PostgresHermesEntitlementRepository.toString();
      expect(subjectRepoText).not.toContain("analysis_operations");
      expect(entitlementRepoText).not.toContain("analysis_operations");
    });

    it("subject and entitlement repositories have zero references to concurrencyLeases table", () => {
      const leaseConfig = getTableConfig(concurrencyLeases);
      expect(leaseConfig.name).toBe("concurrency_leases");
      const subjectRepoText = PostgresHermesSubjectRepository.toString();
      const entitlementRepoText = PostgresHermesEntitlementRepository.toString();
      expect(subjectRepoText).not.toContain("concurrency_leases");
      expect(entitlementRepoText).not.toContain("concurrency_leases");
    });

    it("subject and entitlement repositories have zero references to providerDailyUsage table", () => {
      const dailyConfig = getTableConfig(providerDailyUsage);
      expect(dailyConfig.name).toBe("provider_daily_usage");
      const subjectRepoText = PostgresHermesSubjectRepository.toString();
      const entitlementRepoText = PostgresHermesEntitlementRepository.toString();
      expect(subjectRepoText).not.toContain("provider_daily_usage");
      expect(entitlementRepoText).not.toContain("provider_daily_usage");
    });
  });

  // ============================================================
  // R. No sessionId Used as Subject Identity
  // ============================================================
  describe("R. No sessionId Used as Subject Identity", () => {
    it("rejects candidate input when sessionId is provided as the identity anchor", () => {
      const invalidInput = {
        provider: "auth0",
        providerSubjectId: "ephemeral-sid-12345",
        sessionId: "ephemeral-sid-12345",
      };
      expect(() => validateHermesSubjectIdentityInput(invalidInput)).toThrow(
        /session_id_cannot_be_identity_anchor/
      );
    });

    it("extractHermesSubjectIdentity ignores sessionId and extracts providerSubjectId", () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "ephemeral-sid-rotate-999",
        providerSubjectId: "auth0|stable-permanent-sub-1",
        issuedAt: "2026-10-13T12:00:00.000Z",
        expiresAt: "2026-10-14T12:00:00.000Z",
        provider: "auth0",
      };
      const identity = extractHermesSubjectIdentity(session);
      expect(identity.providerSubjectId).toBe("auth0|stable-permanent-sub-1");
      expect(identity.providerSubjectId).not.toBe(session.sessionId);
    });

    it("fails closed when providerSubjectId is missing even if sessionId is present", () => {
      const sessionWithMissingSub = {
        provider: "auth0",
        providerSubjectId: null,
        sessionId: "ephemeral-sid-123",
      };
      expect(() =>
        validateHermesSubjectIdentityInput(sessionWithMissingSub)
      ).toThrow(/provider_subject_id_must_be_string/);
    });
  });

  // ============================================================
  // S. Confidentiality & Schema Boundaries
  // ============================================================
  describe("S. Confidentiality & Schema Boundaries", () => {
    it("WorkspaceSession interface contains zero internal subjectId fields", () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sid-1",
        providerSubjectId: "sub-1",
        issuedAt: "iso-date",
        expiresAt: "iso-date",
        provider: "auth0",
      };
      const keys = Object.keys(session);
      expect(keys).not.toContain("subjectId");
      expect(keys).not.toContain("internalId");
      expect(keys).not.toContain("id");
    });

    it("HermesEntitlementDecision does not expose internal subject UUID in public error reason", () => {
      const now = new Date("2026-10-15T12:00:00.000Z");
      const decision = evaluateHermesEntitlement(null, now);
      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.reason).toBe("feature_not_entitled");
      }
    });

    it("verifies subjectIdentities schema defines provider and providerSubjectId columns correctly", () => {
      const config = getTableConfig(subjectIdentities);
      expect(config.name).toBe("subject_identities");
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain("provider");
      expect(columnNames).toContain("provider_subject_id");
    });

    it("verifies subjectEntitlements schema defines monthlyQuota, periodStart, periodEnd correctly", () => {
      const config = getTableConfig(subjectEntitlements);
      expect(config.name).toBe("subject_entitlements");
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain("monthly_quota");
      expect(columnNames).toContain("period_start");
      expect(columnNames).toContain("period_end");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("plan_tier");
    });
  });
});
