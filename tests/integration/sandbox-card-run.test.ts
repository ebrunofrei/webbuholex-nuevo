import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/payments/sandbox/card-run/route";
import * as authResolver from "@/lib/authorization/authorization-resolver";
import { PaymentService } from "@/lib/payments/payment-service";
import * as createPaymentAttemptModule from "@/lib/payments/create-payment-attempt";

// Mock dependencies
vi.mock("@/lib/auth/session");
vi.mock("@/lib/authorization/authorization-resolver");
vi.mock("@/database/client");

import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/authorization/authorization-resolver");
vi.mock("@/database/client");

describe("PAY-5D.2B.3 Sandbox Card Run API", () => {
  const originalEnv = process.env.VERCEL_ENV;
  let mockUowExecute: any;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.VERCEL_ENV = "preview";

    mockUowExecute = vi.spyOn(PostgresPaymentUnitOfWork.prototype, 'execute');

    // Mock the dependencies called inside the route
    vi.spyOn(PaymentService.prototype, 'createPaymentOrderFromApprovedQuote').mockResolvedValue({
      id: "ord_test",
      amountMinor: 500,
      currency: "PEN",
      status: "awaiting_payment",
    } as any);

    mockUowExecute.mockImplementation(async (_callback: unknown) => {
      // If it's the quote save, it uses { quotes }
      // If it's the attempt creation, it uses context
      return {
        id: "att_test",
        status: "created",
      };
    });
  });

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
  });

  function createPostRequest() {
    return new NextRequest("http://localhost/api/admin/payments/sandbox/card-run", {
      method: "POST",
    });
  }

  it("rejects non-preview environment", async () => {
    process.env.VERCEL_ENV = "production";
    (process.env as any).NODE_ENV = "production";
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("rejects unauthorized access", async () => {
    (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "unauthenticated" });
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("creates quote, order, and attempt with fixed values", async () => {
    (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

    const res = await POST();
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.amountMinor).toBe(500);
    expect(json.currency).toBe("PEN");
    expect(json.orderId).toBe("ord_test");
    expect(json.attemptId).toBe("att_test");
    expect(json.status).toBe("created");
  });
});
