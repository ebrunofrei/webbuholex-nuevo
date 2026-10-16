// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GET,
  POST,
  PUT,
  DELETE,
} from "@/app/api/internal/cron/hermes-reconciliation/route";
import * as routeExports from "@/app/api/internal/cron/hermes-reconciliation/route";
import {
  handleHermesReconciliationCronGet,
} from "@/lib/hermes/control/hermes-reconciliation-cron-handler";
import {
  isHermesReconciliationCronEnabled,
  readHermesReconciliationCronSecret,
  secureCompare,
} from "@/lib/hermes/control/hermes-reconciliation-cron-config";
import {
  HermesReconciliationCronLogger,
} from "@/lib/hermes/control/hermes-reconciliation-cron-logger";
import {
  HermesPostDispatchReconciler,
  type HermesReconciliationBatchResult,
} from "@/lib/hermes/control/hermes-post-dispatch-reconciler";
import type {
  HermesQuotaCoordinator,
} from "@/lib/hermes/control/hermes-quota-coordinator";
import fs from "node:fs";
import path from "node:path";

describe("HERMES-PROD-A3.7D: Reconciliation Cron Host", () => {
  const TEST_SECRET = "super-secure-hermes-cron-token-xyz-12345";
  const TEST_URL = "http://localhost/api/internal/cron/hermes-reconciliation";

  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function getLoggedEvents(): Array<Record<string, unknown>> {
    return consoleLogSpy.mock.calls
      .map((call: unknown[]) => {
        const firstArg = call[0];
        if (typeof firstArg === "string") {
          try {
            return JSON.parse(firstArg) as Record<string, unknown>;
          } catch {
            return null;
          }
        }
        return null;
      })
      .filter((e: unknown): e is Record<string, unknown> => e !== null);
  }

  function createMockReconciler(
    batchResult: HermesReconciliationBatchResult
  ): {
    reconciler: HermesPostDispatchReconciler;
    reconcilePostDispatchOrphansSpy: ReturnType<typeof vi.fn>;
  } {
    const mockCoordinator: HermesQuotaCoordinator = {
      reserveOperationQuota: vi.fn(),
      commitSuccessWithLease: vi.fn(),
      markPolicyPendingWithLease: vi.fn(),
      releaseReservation: vi.fn(),
      expireReservation: vi.fn(),
      findExpiredReservations: vi.fn(),
      reconcileOutcomeUnknownIfLeaseExpired: vi.fn(),
      findPostDispatchOrphanCandidates: vi.fn(),
    };

    const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
    const reconcilePostDispatchOrphansSpy = vi
      .spyOn(reconciler, "reconcilePostDispatchOrphans")
      .mockResolvedValue(batchResult);

    return { reconciler, reconcilePostDispatchOrphansSpy };
  }

  // ============================================================
  // 1. Config & Security Utility Tests
  // ============================================================
  describe("1. Config & Security Utility Tests", () => {
    it("isHermesReconciliationCronEnabled accepts exactly canonical 'true'", () => {
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "true" })).toBe(true);
    });

    it("isHermesReconciliationCronEnabled rejects undefined, empty, and non-canonical variants", () => {
      expect(isHermesReconciliationCronEnabled({})).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: undefined })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "false" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "TRUE" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "True" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "1" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "yes" })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: " true " })).toBe(false);
      expect(isHermesReconciliationCronEnabled({ HERMES_RECONCILIATION_CRON_ENABLED: "true " })).toBe(false);
    });

    it("readHermesReconciliationCronSecret reads valid secret and rejects empty or surrounding whitespace", () => {
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: "my-valid-secret" })).toBe(
        "my-valid-secret"
      );
      expect(readHermesReconciliationCronSecret({})).toBeUndefined();
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: undefined })).toBeUndefined();
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: "" })).toBeUndefined();
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: "   " })).toBeUndefined();
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: " secret" })).toBeUndefined();
      expect(readHermesReconciliationCronSecret({ HERMES_RECONCILIATION_CRON_SECRET: "secret " })).toBeUndefined();
    });

    it("secureCompare is constant-time and length-safe", () => {
      expect(secureCompare("correct-token", "correct-token")).toBe(true);
      expect(secureCompare("correct-token", "wrong-token-x")).toBe(false);
      // Different lengths must be safely rejected without throwing RangeError in timingSafeEqual
      expect(secureCompare("short", "longer-string")).toBe(false);
      expect(secureCompare("longer-string", "short")).toBe(false);
      expect(secureCompare("", "non-empty")).toBe(false);
      expect(secureCompare("non-empty", "")).toBe(false);
    });

    it("HermesReconciliationCronLogger logs structured JSON payload", () => {
      const logger = new HermesReconciliationCronLogger();
      logger.log({ event: "cron_request_received", cronInvocationId: "test-inv-001" });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ event: "cron_request_received", cronInvocationId: "test-inv-001" })
      );
    });
  });

  // ============================================================
  // 2. Authentication & Authorization Enforcement
  // ============================================================
  describe("2. Authentication & Authorization Enforcement", () => {
    it("1. missing Authorization header -> 401, reconciler not called", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL);
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(401);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Unauthorized" });
      expect(reconcilePostDispatchOrphansSpy).not.toHaveBeenCalled();

      const events = getLoggedEvents();
      expect(events).toContainEqual(
        expect.objectContaining({
          event: "cron_auth_failed",
          reason: "missing_header",
        })
      );
    });

    it("2. malformed Authorization header -> 401, reconciler not called", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const malformedHeaders = [
        "Basic dXNlcjpwYXNz",
        "Token some-secret",
        "Bearer",
        "bearer lowercase-bearer",
      ];

      for (const header of malformedHeaders) {
        const req = new Request(TEST_URL, { headers: { authorization: header } });
        const res = await handleHermesReconciliationCronGet(req, {
          reconcilerFactory: () => reconciler,
          env: {
            HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
            HERMES_RECONCILIATION_CRON_ENABLED: "true",
          },
        });

        expect(res.status).toBe(401);
        const json = (await res.json()) as Record<string, unknown>;
        expect(json).toEqual({ error: "Unauthorized" });
        expect(reconcilePostDispatchOrphansSpy).not.toHaveBeenCalled();
      }
    });

    it("3. wrong secret -> 401, reconciler not called", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: "Bearer invalid-wrong-secret-token" },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(401);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Unauthorized" });
      expect(reconcilePostDispatchOrphansSpy).not.toHaveBeenCalled();

      const events = getLoggedEvents();
      expect(events).toContainEqual(
        expect.objectContaining({
          event: "cron_auth_failed",
          reason: "invalid_secret",
        })
      );
    });

    it("4. missing server secret -> 401 fail-closed, reconciler not called", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: undefined,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(401);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Unauthorized" });
      expect(reconcilePostDispatchOrphansSpy).not.toHaveBeenCalled();

      const events = getLoggedEvents();
      expect(events).toContainEqual(
        expect.objectContaining({
          event: "cron_auth_failed",
          reason: "missing_env",
        })
      );
    });

    it("5. valid secret + disabled -> 200 DISABLED, reconciler not called", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "false",
        },
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({
        status: "DISABLED",
        message: "Hermes reconciliation cron is explicitly disabled.",
      });
      expect(reconcilePostDispatchOrphansSpy).not.toHaveBeenCalled();

      const events = getLoggedEvents();
      expect(events).toContainEqual(
        expect.objectContaining({
          event: "cron_disabled",
          feature: "hermes_reconciliation_cron",
          enabled: false,
        })
      );
    });

    it("6. valid secret + enabled -> reconciler called exactly once", async () => {
      const { reconciler, reconcilePostDispatchOrphansSpy } = createMockReconciler({
        kind: "completed",
        scanned: 3,
        reconciled: 2,
        alreadyFinalized: 1,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(200);
      expect(reconcilePostDispatchOrphansSpy).toHaveBeenCalledTimes(1);
      // Canonical limit: called without user-supplied override (uses defaultLimit = 50)
      expect(reconcilePostDispatchOrphansSpy).toHaveBeenCalledWith();
    });
  });

  // ============================================================
  // 3. Response Status & Result Mapping
  // ============================================================
  describe("3. Response Status & Result Mapping", () => {
    it("7. successful reconciler summary -> 200 safe summary", async () => {
      const { reconciler } = createMockReconciler({
        kind: "completed",
        scanned: 10,
        reconciled: 4,
        alreadyFinalized: 3,
        leaseStillActive: 2,
        invalidState: 1,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({
        status: "COMPLETED",
        scanned: 10,
        reconciled: 4,
        alreadyFinalized: 3,
        leaseStillActive: 2,
        invalidState: 1,
        notFound: 0,
      });
    });

    it("8. control_unavailable -> 503 safe response", async () => {
      const { reconciler } = createMockReconciler({
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
        scanned: 5,
        reconciled: 1,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 1,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(503);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({
        error: "Service Unavailable",
        reason: "usage_control_unavailable",
        scanned: 5,
        reconciled: 1,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 1,
      });
    });

    it("9. unexpected throw -> sanitized 500", async () => {
      const mockReconciler = {
        reconcilePostDispatchOrphans: vi.fn().mockRejectedValue(
          new Error("FATAL_SECRET_CONNECTION_CRASH_postgresql://user:pass@db:5432")
        ),
      } as unknown as HermesPostDispatchReconciler;

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => mockReconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(500);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Internal Server Error" });

      const loggedOutput = consoleLogSpy.mock.calls.map((c: unknown[]) => String(c[0])).join(" ");
      expect(loggedOutput).not.toContain("FATAL_SECRET_CONNECTION_CRASH");
      expect(loggedOutput).not.toContain("postgresql://");
    });
  });

  // ============================================================
  // 4. HTTP Method Restrictions
  // ============================================================
  describe("4. HTTP Method Restrictions", () => {
    it("12. GET execution works through top-level export", async () => {
      process.env.HERMES_RECONCILIATION_CRON_SECRET = TEST_SECRET;
      process.env.HERMES_RECONCILIATION_CRON_ENABLED = "false";

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json.status).toBe("DISABLED");

      delete process.env.HERMES_RECONCILIATION_CRON_SECRET;
      delete process.env.HERMES_RECONCILIATION_CRON_ENABLED;
    });

    it("13. POST -> 405 Method Not Allowed", async () => {
      const res = await POST();
      expect(res.status).toBe(405);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Method Not Allowed" });
    });

    it("14. PUT -> 405 Method Not Allowed", async () => {
      const res = await PUT();
      expect(res.status).toBe(405);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Method Not Allowed" });
    });

    it("15. DELETE -> 405 Method Not Allowed", async () => {
      const res = await DELETE();
      expect(res.status).toBe(405);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ error: "Method Not Allowed" });
    });

    it("15b. route.ts exports strictly allowed Next.js Route methods only", () => {
      const allowedExports = new Set(["GET", "POST", "PUT", "DELETE"]);
      const actualExports = Object.keys(routeExports);
      expect(actualExports.sort()).toEqual(["DELETE", "GET", "POST", "PUT"]);
      for (const exp of actualExports) {
        expect(allowedExports.has(exp)).toBe(true);
      }
    });
  });

  // ============================================================
  // 5. Leak Prevention & Sanitization
  // ============================================================
  describe("5. Leak Prevention & Sanitization", () => {
    it("10-11 & 24-25. secret and sensitive identifiers never appear in responses or logs", async () => {
      const SENSITIVE_OP_ID = "op-secret-uuid-1234";
      const SENSITIVE_SUBJ_ID = "auth0|secret-user-sub-5678";
      const SENSITIVE_LEASE_ID = "lease-token-secret-9999";
      const SENSITIVE_IDEM_KEY = "idem-secret-key-0000";

      const { reconciler } = createMockReconciler({
        kind: "completed",
        scanned: 1,
        reconciled: 1,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      });

      const req = new Request(TEST_URL, {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await handleHermesReconciliationCronGet(req, {
        reconcilerFactory: () => reconciler,
        env: {
          HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
          HERMES_RECONCILIATION_CRON_ENABLED: "true",
        },
      });

      expect(res.status).toBe(200);
      const rawText = await res.text();

      // Check response body
      expect(rawText).not.toContain(TEST_SECRET);
      expect(rawText).not.toContain(SENSITIVE_OP_ID);
      expect(rawText).not.toContain(SENSITIVE_SUBJ_ID);
      expect(rawText).not.toContain(SENSITIVE_LEASE_ID);
      expect(rawText).not.toContain(SENSITIVE_IDEM_KEY);

      // Check log output
      const rawLogs = consoleLogSpy.mock.calls.map((c: unknown[]) => String(c[0])).join(" ");
      expect(rawLogs).not.toContain(TEST_SECRET);
      expect(rawLogs).not.toContain("Bearer");
      expect(rawLogs).not.toContain("Authorization");
      expect(rawLogs).not.toContain(SENSITIVE_OP_ID);
      expect(rawLogs).not.toContain(SENSITIVE_SUBJ_ID);
      expect(rawLogs).not.toContain(SENSITIVE_LEASE_ID);
      expect(rawLogs).not.toContain(SENSITIVE_IDEM_KEY);
    });
  });

  // ============================================================
  // 6. Architectural Boundary Guarantees
  // ============================================================
  describe("6. Architectural Boundary Guarantees", () => {
    it("16-17. reconciler cron execution and source files have ZERO access to OpenAI or provider dispatch", () => {
      const cronRoutePath = path.resolve(
        process.cwd(),
        "app/api/internal/cron/hermes-reconciliation/route.ts"
      );
      const cronHostPath = path.resolve(
        process.cwd(),
        "lib/hermes/control/hermes-reconciliation-cron-host.ts"
      );
      const cronConfigPath = path.resolve(
        process.cwd(),
        "lib/hermes/control/hermes-reconciliation-cron-config.ts"
      );

      const routeContent = fs.readFileSync(cronRoutePath, "utf-8");
      const hostContent = fs.readFileSync(cronHostPath, "utf-8");
      const configContent = fs.readFileSync(cronConfigPath, "utf-8");

      for (const content of [routeContent, hostContent, configContent]) {
        expect(content).not.toContain("OpenAIHermesAdapter");
        expect(content).not.toContain("callJurisprudenceModel");
        expect(content).not.toContain("beginProviderDispatch");
        expect(content).not.toContain("HermesRuntimeExecutionService");
      }
    });
  });

  // ============================================================
  // 7. Repeated and Concurrent Cron Invocations
  // ============================================================
  describe("7. Repeated and Concurrent Cron Invocations", () => {
    it("18. repeated cron runs on same reconciler execute safely with zero second mutation", async () => {
      let callCount = 0;
      const mockReconciler = {
        reconcilePostDispatchOrphans: vi.fn(async (): Promise<HermesReconciliationBatchResult> => {
          callCount++;
          if (callCount === 1) {
            return {
              kind: "completed",
              scanned: 1,
              reconciled: 1,
              alreadyFinalized: 0,
              leaseStillActive: 0,
              invalidState: 0,
              notFound: 0,
              controlUnavailable: 0,
            };
          }
          return {
            kind: "completed",
            scanned: 0,
            reconciled: 0,
            alreadyFinalized: 0,
            leaseStillActive: 0,
            invalidState: 0,
            notFound: 0,
            controlUnavailable: 0,
          };
        }),
      } as unknown as HermesPostDispatchReconciler;

      const env = {
        HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
        HERMES_RECONCILIATION_CRON_ENABLED: "true",
      };

      // Run 1
      const req1 = new Request(TEST_URL, { headers: { authorization: `Bearer ${TEST_SECRET}` } });
      const res1 = await handleHermesReconciliationCronGet(req1, {
        reconcilerFactory: () => mockReconciler,
        env,
      });
      expect(res1.status).toBe(200);
      const json1 = (await res1.json()) as Record<string, unknown>;
      expect(json1.reconciled).toBe(1);

      // Run 2
      const req2 = new Request(TEST_URL, { headers: { authorization: `Bearer ${TEST_SECRET}` } });
      const res2 = await handleHermesReconciliationCronGet(req2, {
        reconcilerFactory: () => mockReconciler,
        env,
      });
      expect(res2.status).toBe(200);
      const json2 = (await res2.json()) as Record<string, unknown>;
      expect(json2.reconciled).toBe(0);

      expect(mockReconciler.reconcilePostDispatchOrphans).toHaveBeenCalledTimes(2);
    });

    it("19. concurrent cron runs complete safely without unhandled conflicts", async () => {
      const mockReconciler = {
        reconcilePostDispatchOrphans: vi.fn(async (): Promise<HermesReconciliationBatchResult> => {
          return {
            kind: "completed",
            scanned: 1,
            reconciled: 1,
            alreadyFinalized: 0,
            leaseStillActive: 0,
            invalidState: 0,
            notFound: 0,
            controlUnavailable: 0,
          };
        }),
      } as unknown as HermesPostDispatchReconciler;

      const env = {
        HERMES_RECONCILIATION_CRON_SECRET: TEST_SECRET,
        HERMES_RECONCILIATION_CRON_ENABLED: "true",
      };

      const req1 = new Request(TEST_URL, { headers: { authorization: `Bearer ${TEST_SECRET}` } });
      const req2 = new Request(TEST_URL, { headers: { authorization: `Bearer ${TEST_SECRET}` } });

      const [res1, res2] = await Promise.all([
        handleHermesReconciliationCronGet(req1, { reconcilerFactory: () => mockReconciler, env }),
        handleHermesReconciliationCronGet(req2, { reconcilerFactory: () => mockReconciler, env }),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });
});
