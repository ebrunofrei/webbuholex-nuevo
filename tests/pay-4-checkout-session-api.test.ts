import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as AdminCreateSession } from "@/app/api/admin/payments/orders/[id]/checkout-session/route";
import { POST as PublicResolveSession } from "@/app/api/payments/checkout-session/resolve/route";
import { PaymentCheckoutSessionService, CheckoutSessionNotFoundError, CheckoutSessionExpiredError, CheckoutSessionRevokedError, PaymentOrderNotEligibleForCheckoutError } from "@/lib/payments/payment-checkout-session-service";
import { NextRequest } from "next/server";
import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import { PaymentOrderNotFoundError } from "@/lib/payments/payment-service";

vi.mock("@/lib/authorization/authorization-resolver");
vi.mock("@/lib/auth/session", () => ({ getWorkspaceSession: vi.fn() }));
vi.mock("@/database/client", () => ({ getDatabase: vi.fn(), getAuthorizationDatabase: vi.fn() }));
vi.mock("@/database/repositories/authorization.repository", () => ({ createAuthorizationRepository: vi.fn() }));

vi.mock("@/lib/payments/payment-checkout-session-service", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PaymentCheckoutSessionService: vi.fn(),
  };
});
vi.mock("@/lib/payments/postgres-payment-unit-of-work", () => ({
  PostgresPaymentUnitOfWork: vi.fn().mockImplementation(() => ({})),
}));

describe("PAY-4 Checkout Session API", () => {
  describe("Admin Create Route", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("rejects unauthenticated", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(401);
    });

    it("rejects capability_missing", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(403);
    });

    it("rejects operator_not_mapped", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_not_mapped" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(403);
    });

    it("rejects operator_inactive", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_inactive" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(403);
    });

    it("rejects authorization_unavailable", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorization_unavailable" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(503);
    });

    it("proves payments:read-only or complaints:* capabilities do not authorize it at resolver boundary", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(403);
      // Prove that it asked for exactly "payments:write"
      expect(resolveTrustedAdminPrincipal).toHaveBeenCalledWith(
        undefined, // mocked getWorkspaceSession returns undefined
        "payments:write",
        undefined  // mocked createAuthorizationRepository returns undefined
      );
    });

    it("rejects invalid UUID BEFORE execution", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: { operatorId: "1", identitySource: "authenticated_session" } });
      PaymentCheckoutSessionService.prototype.createCheckoutSessionForPaymentOrder = vi.fn();
      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "not-a-uuid" }) });
      expect(res.status).toBe(400);
      expect(PaymentCheckoutSessionService.prototype.createCheckoutSessionForPaymentOrder).not.toHaveBeenCalled();
    });

    it("allows authorized and returns token", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: { operatorId: "1", identitySource: "authenticated_session" } });
      const createMock = vi.fn().mockResolvedValue({
        sessionId: "sess-1",
        token: "tok-1",
        expiresAt: new Date(),
      });
      PaymentCheckoutSessionService.prototype.createCheckoutSessionForPaymentOrder = createMock;

      const req = new NextRequest("http://localhost/api");
      const res = await AdminCreateSession(req, { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.token).toBe("tok-1");
      expect(data.tokenHash).toBeUndefined();
    });
  });

  describe("Public Resolve Route", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("rejects invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: "{" });
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
    });

    it("rejects missing token", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({}) });
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
    });

    it("rejects extra property", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(43), extra: true }) });
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
    });

    it("rejects 42-char token without reaching service", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(42) }) });
      PaymentCheckoutSessionService.prototype.resolveCheckoutSession = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
      expect(PaymentCheckoutSessionService.prototype.resolveCheckoutSession).not.toHaveBeenCalled();
    });

    it("rejects 44-char token without reaching service", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(44) }) });
      PaymentCheckoutSessionService.prototype.resolveCheckoutSession = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
      expect(PaymentCheckoutSessionService.prototype.resolveCheckoutSession).not.toHaveBeenCalled();
    });

    it("rejects invalid charset without reaching service", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(42) + "!" }) });
      PaymentCheckoutSessionService.prototype.resolveCheckoutSession = vi.fn().mockRejectedValue(new Error("Should not be called"));
      const res = await PublicResolveSession(req);
      expect(res.status).toBe(400);
      expect(PaymentCheckoutSessionService.prototype.resolveCheckoutSession).not.toHaveBeenCalled();
    });

    it("returns 404 for all unusable states (uniform concealment)", async () => {
      const states = [
        new CheckoutSessionNotFoundError("n"),
        new CheckoutSessionExpiredError("e"),
        new CheckoutSessionRevokedError("r"),
        new PaymentOrderNotEligibleForCheckoutError("ne"),
        new PaymentOrderNotFoundError("p")
      ];

      for (const err of states) {
        const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(43) }) });
        PaymentCheckoutSessionService.prototype.resolveCheckoutSession = vi.fn().mockRejectedValue(err);
        const res = await PublicResolveSession(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toEqual({ error: "Not Found" });
      }
    });

    it("returns DTO without leaking internals", async () => {
      const req = new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ token: "a".repeat(43) }) });
      PaymentCheckoutSessionService.prototype.resolveCheckoutSession = vi.fn().mockResolvedValue({
        serviceId: "srv-1",
        subOfferId: null,
        amountMinor: 1000,
        currency: "PEN",
        checkoutSessionExpiresAt: new Date(),
        paymentOrderExpiresAt: null,
        // Mocking some extra properties that shouldn't leak even if they are in the result
        paymentOrder: { id: "p" },
        checkoutSession: { id: "c" },
        customerReference: "ref",
        idempotencyKey: "idem",
        tokenHash: "hash",
        providerOrderId: "porder",
        providerPaymentId: "ppay",
        status: "active"
      });

      const res = await PublicResolveSession(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0");

      const data = await res.json();
      expect(data).toHaveProperty("serviceId");
      expect(data).toHaveProperty("subOfferId");
      expect(data).toHaveProperty("amountMinor");
      expect(data).toHaveProperty("currency");
      expect(data).toHaveProperty("checkoutSessionExpiresAt");
      expect(data).toHaveProperty("paymentOrderExpiresAt");

      expect(data).not.toHaveProperty("paymentOrder");
      expect(data).not.toHaveProperty("checkoutSession");
      expect(data).not.toHaveProperty("customerReference");
      expect(data).not.toHaveProperty("idempotencyKey");
      expect(data).not.toHaveProperty("tokenHash");
      expect(data).not.toHaveProperty("providerOrderId");
      expect(data).not.toHaveProperty("providerPaymentId");
      expect(data).not.toHaveProperty("status");
    });
  });
});
