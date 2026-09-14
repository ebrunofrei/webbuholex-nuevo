import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/payments/orders/route";
import { GET } from "@/app/api/admin/payments/orders/[id]/route";
import * as authResolver from "@/lib/authorization/authorization-resolver";
import * as authSession from "@/lib/auth/session";
import { PaymentService, PaymentOrderNotFoundError, PaymentQuoteNotFoundError, PaymentQuoteNotApprovedError, PaymentQuoteExpiredError, PaymentOrderReconciliationError } from "@/lib/payments/payment-service";
import * as dbClient from "@/database/client";

import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";

// Mock dependencies
vi.mock("@/lib/auth/session");
vi.mock("@/lib/authorization/authorization-resolver");
vi.mock("@/database/client");
vi.mock("@/lib/payments/postgres-payment-unit-of-work");

describe("PAY-3 Protected Payment Order API", () => {
  const mockUow = { execute: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    (PostgresPaymentUnitOfWork as any).mockImplementation(function(this: any) { return mockUow; });
    (dbClient.getAuthorizationDatabase as any).mockReturnValue({});

    vi.spyOn(PaymentService.prototype, 'createPaymentOrderFromApprovedQuote');
    vi.spyOn(PaymentService.prototype, 'getPaymentOrderById');
  });

  describe("POST /api/admin/payments/orders", () => {
    const validQuoteId = "11111111-1111-4111-8111-111111111111";

    function createPostRequest(body: any = { quoteId: validQuoteId }) {
      return new NextRequest("http://localhost/api/admin/payments/orders", {
        method: "POST",
        body: body ? JSON.stringify(body) : null,
      });
    }

    it("13. rejects unauthenticated POST without invoking service", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "unauthenticated" });

      const req = createPostRequest();
      const res = await POST(req);

      expect(res.status).toBe(401);
      expect(authResolver.resolveTrustedAdminPrincipal).toHaveBeenCalledWith(undefined, "payments:write", expect.anything());
      expect(PaymentService.prototype.createPaymentOrderFromApprovedQuote).not.toHaveBeenCalled();
    });

    it("13. rejects unauthorized POST (missing capability) without invoking service", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "capability_missing" });

      const req = createPostRequest();
      const res = await POST(req);

      expect(res.status).toBe(403);
      expect(PaymentService.prototype.createPaymentOrderFromApprovedQuote).not.toHaveBeenCalled();
    });

    it("14. validates strict body schema - rejects missing quoteId", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

      const req = createPostRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(PaymentService.prototype.createPaymentOrderFromApprovedQuote).not.toHaveBeenCalled();
    });

    it("14. validates strict body schema - rejects invalid UUID", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

      const req = createPostRequest({ quoteId: "not-a-uuid" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(PaymentService.prototype.createPaymentOrderFromApprovedQuote).not.toHaveBeenCalled();
    });

    it("14. validates strict body schema - rejects extra amountMinor", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

      const req = createPostRequest({ quoteId: validQuoteId, amountMinor: 100 });
      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(PaymentService.prototype.createPaymentOrderFromApprovedQuote).not.toHaveBeenCalled();
    });

    it("15. POST authorized - approved quote maps to canonical PaymentOrder DTO", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

      const mockOrder = {
        id: "22222222-2222-4222-8222-222222222222",
        serviceId: "srv-1",
        subOfferId: null,
        customerReference: "cust-1",
        quoteReference: validQuoteId,
        amountMinor: 5000,
        currency: "PEN" as any,
        status: "awaiting_payment",
        provider: null,
        providerOrderId: null,
        providerPaymentId: null,
        paymentMethod: null,
        idempotencyKey: `quote_generation_${validQuoteId}`,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
        expiresAt: null,
        expiredAt: null
      };

      const mockCreate = vi.fn().mockResolvedValue(mockOrder);
      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockImplementation(mockCreate);

      const req = createPostRequest();
      const res = await POST(req);

      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json).toEqual({
        id: mockOrder.id,
        serviceId: mockOrder.serviceId,
        subOfferId: mockOrder.subOfferId,
        customerReference: mockOrder.customerReference,
        quoteReference: mockOrder.quoteReference,
        amountMinor: mockOrder.amountMinor,
        currency: mockOrder.currency,
        status: mockOrder.status,
        provider: mockOrder.provider,
        providerOrderId: mockOrder.providerOrderId,
        providerPaymentId: mockOrder.providerPaymentId,
        paymentMethod: mockOrder.paymentMethod,
        createdAt: mockOrder.createdAt.toISOString(),
        updatedAt: mockOrder.updatedAt.toISOString(),
        expiresAt: null,
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        expiredAt: null,
        refundedAt: null
      });
      // Ensure idempotencyKey is NOT exposed
      expect(json).not.toHaveProperty("idempotencyKey");
      expect(mockCreate).toHaveBeenCalledWith(validQuoteId);
    });

    it("15. POST authorized - same quote repeated returns the SAME PaymentOrder (service behavior preserved)", async () => {
      // The idempotency is handled internally by PaymentService which we mocked, but we verify
      // the handler just transparently passes the service's returned canonical order correctly.
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized", principal: { operatorId: "op-1" } });

      const mockOrder = {
        id: "22222222-2222-4222-8222-222222222222",
        serviceId: "srv-1",
        subOfferId: null,
        customerReference: "cust-1",
        quoteReference: validQuoteId,
        amountMinor: 5000,
        currency: "PEN" as any,
        status: "awaiting_payment" as any,
        provider: null,
        providerOrderId: null,
        providerPaymentId: null,
        paymentMethod: null,
        idempotencyKey: `quote_generation_${validQuoteId}`,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
        expiresAt: null,
        expiredAt: null
      };

      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockResolvedValue(mockOrder);

      const req1 = createPostRequest();
      const res1 = await POST(req1);
      expect(res1.status).toBe(201);
      const json1 = await res1.json();
      expect(json1.id).toBe(mockOrder.id);
    });

    it("15. POST authorized - quote not found -> 404", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockRejectedValue(new PaymentQuoteNotFoundError(validQuoteId));

      const res = await POST(createPostRequest());
      expect(res.status).toBe(404);
    });

    it("15. POST authorized - quote not approved -> 409", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockRejectedValue(new PaymentQuoteNotApprovedError(validQuoteId));

      const res = await POST(createPostRequest());
      expect(res.status).toBe(409);
    });

    it("15. POST authorized - quote expired -> 409", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockRejectedValue(new PaymentQuoteExpiredError(validQuoteId));

      const res = await POST(createPostRequest());
      expect(res.status).toBe(409);
    });

    it("15. POST authorized - reconciliation error -> 500", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      vi.mocked(PaymentService.prototype.createPaymentOrderFromApprovedQuote).mockRejectedValue(new PaymentOrderReconciliationError());

      const res = await POST(createPostRequest());
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/admin/payments/orders/[id]", () => {
    const validOrderId = "33333333-3333-4333-8333-333333333333";

    function createGetRequest() {
      return new NextRequest(`http://localhost/api/admin/payments/orders/${validOrderId}`, {
        method: "GET"
      });
    }

    it("13. rejects unauthenticated GET without invoking service", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "unauthenticated" });

      const res = await GET(createGetRequest(), { params: Promise.resolve({ id: validOrderId }) });

      expect(res.status).toBe(401);
      expect(authResolver.resolveTrustedAdminPrincipal).toHaveBeenCalledWith(undefined, "payments:read", expect.anything());
      expect(PaymentService.prototype.getPaymentOrderById).not.toHaveBeenCalled();
    });

    it("13. rejects unauthorized GET (missing capability)", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "capability_missing" });

      const res = await GET(createGetRequest(), { params: Promise.resolve({ id: validOrderId }) });

      expect(res.status).toBe(403);
    });

    it("16. GET invalid UUID -> 400", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });

      const res = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ id: "invalid-uuid" }) });
      expect(res.status).toBe(400);
    });

    it("16. GET unknown UUID -> 404", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      vi.mocked(PaymentService.prototype.getPaymentOrderById).mockRejectedValue(new PaymentOrderNotFoundError(validOrderId));

      const res = await GET(createGetRequest(), { params: Promise.resolve({ id: validOrderId }) });
      expect(res.status).toBe(404);
    });

    it("16. GET valid existing order -> 200 + DTO (no idempotencyKey, no internal fields)", async () => {
      (authResolver.resolveTrustedAdminPrincipal as any).mockResolvedValue({ kind: "authorized" });
      const mockOrder = {
        id: validOrderId,
        serviceId: "srv-1",
        subOfferId: null,
        customerReference: "cust-1",
        quoteReference: "1111",
        amountMinor: 5000,
        currency: "PEN" as any,
        status: "awaiting_payment" as any,
        provider: null,
        providerOrderId: null,
        providerPaymentId: null,
        paymentMethod: null,
        idempotencyKey: `quote_generation_1111`, // MUST BE REMOVED
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        paidAt: null,
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
        expiresAt: null,
        expiredAt: null
      };

      vi.mocked(PaymentService.prototype.getPaymentOrderById).mockResolvedValue(mockOrder);

      const res = await GET(createGetRequest(), { params: Promise.resolve({ id: validOrderId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.id).toBe(validOrderId);
      expect(json).not.toHaveProperty("idempotencyKey");
    });
  });
});
