import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/admin/payments/sandbox/charge/route";
import * as authResolver from "@/lib/authorization/authorization-resolver";
import { ChargeOrchestrationService } from "@/lib/payments/charge-orchestration-service";
import { CulqiProviderAdapter } from "@/lib/payments/culqi-provider-adapter";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/authorization/authorization-resolver");
vi.mock("@/database/client");

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

describe("PAY-5D.2B.3 Sandbox Charge API", () => {
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.VERCEL_ENV = "preview";
  });

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercelEnv;
    vi.restoreAllMocks();
  });

  function createPostRequest(body: unknown): NextRequest {
    return new NextRequest(
      "http://localhost/api/admin/payments/sandbox/charge",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  }

  function authorizeOperator(): void {
    vi.mocked(authResolver.resolveTrustedAdminPrincipal).mockResolvedValue({
      kind: "authorized",
      principal: {} as never,
    });
  }

  it("rejects non-preview environment", async () => {
    process.env.VERCEL_ENV = "production";

    const res = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_123",
      }),
    );

    expect(res.status).toBe(404);
  });

  it("rejects unauthorized access", async () => {
    vi.mocked(authResolver.resolveTrustedAdminPrincipal).mockResolvedValue({
      kind: "unauthenticated",
    });

    const res = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_123",
      }),
    );

    expect(res.status).toBe(403);
  });

  it("validates request body (tkn_ required)", async () => {
    authorizeOperator();

    const res = await POST(
      createPostRequest({
        attemptId: "not-a-uuid",
        sourceToken: "bad_token",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("validates request body strictly (rejects unknown properties)", async () => {
    authorizeOperator();

    const amountResponse = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_valid",
        amountMinor: 500,
      }),
    );

    expect(amountResponse.status).toBe(400);

    const emailResponse = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_valid",
        email: "x@y.com",
      }),
    );

    expect(emailResponse.status).toBe(400);

    const providerResponse = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_valid",
        provider: "culqi",
      }),
    );

    expect(providerResponse.status).toBe(400);
  });

  it("executes charge and returns sanitized result", async () => {
    authorizeOperator();

    vi.spyOn(
      ChargeOrchestrationService.prototype,
      "executeCharge",
    ).mockResolvedValue(undefined);

    vi.spyOn(
      PostgresPaymentUnitOfWork.prototype,
      "execute",
    ).mockImplementation(async () => {
      return {
        id: ATTEMPT_ID,
        status: "succeeded",
        paymentOrderId: ORDER_ID,
      };
    });

    const res = await POST(
      createPostRequest({
        attemptId: ATTEMPT_ID,
        sourceToken: "tkn_valid",
      }),
    );

    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.resultClass).toBe("succeeded");
    expect(json).not.toHaveProperty("sourceToken");
  });

  it(
    "concurrency test: ensures mocked provider createCharge is only called once for concurrent requests",
    async () => {
      authorizeOperator();

      const mockCreateCharge = vi.fn().mockResolvedValue({
        providerPaymentId: "chr_mock",
        amountMinor: 500,
        currency: "PEN",
        providerState: "success",
      });

      vi.spyOn(
        CulqiProviderAdapter.prototype,
        "createCharge",
      ).mockImplementation(mockCreateCharge);

      let attemptStatus:
        | "created"
        | "processing"
        | "succeeded"
        | "failed"
        | "indeterminate" = "created";

      let orderStatus:
        | "awaiting_payment"
        | "processing"
        | "paid"
        | "failed" = "awaiting_payment";

      let providerPaymentId: string | null = null;
      let claimed = false;

      const attempts = {
        findById: vi.fn().mockImplementation(async () => ({
          id: ATTEMPT_ID,
          paymentOrderId: ORDER_ID,
          status: attemptStatus,
          provider: "culqi",
          paymentMethod: "card",
          operationKey: "sandbox-op-concurrency-test",
          providerPaymentId,
        })),

        claimAttempt: vi.fn().mockImplementation(async () => {
          if (claimed) {
            return false;
          }

          claimed = true;
          attemptStatus = "processing";

          return true;
        }),

        assignProviderPaymentId: vi
          .fn()
          .mockImplementation(async (_attemptId: string, value: string) => {
            providerPaymentId = value;
            return true;
          }),

        transitionStatusFromProcessing: vi
          .fn()
          .mockImplementation(async (_attemptId: string, nextStatus: string) => {
            if (
              nextStatus === "succeeded" ||
              nextStatus === "failed" ||
              nextStatus === "indeterminate"
            ) {
              attemptStatus = nextStatus;
            }

            return true;
          }),
      };

      const orders = {
        findByIdForUpdate: vi.fn().mockImplementation(async () => ({
          id: ORDER_ID,
          status: orderStatus,
          amountMinor: 500,
          currency: "PEN",
          customerEmail: "e2e-culqi-sandbox@buholex.com",
          paymentMethod: "card",
          providerPaymentId,
        })),

        finalizePaidFromAwaitingPayment: vi
          .fn()
          .mockImplementation(async () => {
            orderStatus = "paid";
            return true;
          }),

        markProcessingFromAwaitingPayment: vi
          .fn()
          .mockImplementation(async () => {
            orderStatus = "processing";
            return true;
          }),

        findById: vi.fn().mockImplementation(async () => ({
          id: ORDER_ID,
          status: orderStatus,
          amountMinor: 500,
          currency: "PEN",
          customerEmail: "e2e-culqi-sandbox@buholex.com",
          paymentMethod: "card",
          providerPaymentId,
        })),
      };

      vi.spyOn(
        PostgresPaymentUnitOfWork.prototype,
        "execute",
      ).mockImplementation(async (callback) => {
        return callback({
          attempts,
          orders,
        } as never);
      });

      const p1 = POST(
        createPostRequest({
          attemptId: ATTEMPT_ID,
          sourceToken: "tkn_valid1",
        }),
      );

      const p2 = POST(
        createPostRequest({
          attemptId: ATTEMPT_ID,
          sourceToken: "tkn_valid2",
        }),
      );

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(mockCreateCharge).toHaveBeenCalledTimes(1);

      expect([res1.status, res2.status].every((status) => status === 200)).toBe(
        true,
      );

      const [json1, json2] = await Promise.all([
        res1.json(),
        res2.json(),
      ]);

      expect(json1).not.toHaveProperty("sourceToken");
      expect(json2).not.toHaveProperty("sourceToken");
    },
  );
});
