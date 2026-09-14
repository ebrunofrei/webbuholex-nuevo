import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChargeOrchestrationService } from "../lib/payments/charge-orchestration-service";
import { UnitOfWork } from "../lib/payments/payment-repositories";
import { CulqiDeclineError, CulqiTimeoutError, CulqiReconciliationError } from "../lib/payments/culqi-errors";
import { PaymentChargeReconciliationError } from "../lib/payments/payment-service";

class MockUnitOfWork implements UnitOfWork {
  constructor(public context: any) {}
  async execute<T>(work: (context: any) => Promise<T>): Promise<T> {
    return work(this.context);
  }
}

describe("ChargeOrchestrationService", () => {
  let uow: MockUnitOfWork;
  let providerClient: any;
  let service: ChargeOrchestrationService;

  let attemptsMock: Record<string, any>;
  let ordersMock: Record<string, any>;

  beforeEach(() => {
    attemptsMock = {
      findById: vi.fn(),
      claimAttempt: vi.fn(),
      assignProviderPaymentId: vi.fn(),
      transitionStatusFromProcessing: vi.fn(),
    };

    ordersMock = {
      findByIdForUpdate: vi.fn(),
      markProcessingFromAwaitingPayment: vi.fn(),
      finalizePaidFromAwaitingPayment: vi.fn(),
    };

    uow = new MockUnitOfWork({
      attempts: attemptsMock,
      orders: ordersMock,
    });

    providerClient = {
      createCharge: vi.fn(),
      getCharge: vi.fn(),
    };

    service = new ChargeOrchestrationService(uow, providerClient as any);
  });

  const baseOrder = {
    id: "ord_1",
    amountMinor: 1000,
    currency: "PEN",
    customerEmail: "test@test.com",
    status: "awaiting_payment",
    expiresAt: null,
  };

  const baseAttempt = {
    id: "att_1",
    paymentOrderId: "ord_1",
    status: "created",
    paymentMethod: "card",
    operationKey: "op_1",
  };

  it("handles missing email", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue({ ...baseOrder, customerEmail: null });
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "failed", expect.any(Date), { failureCategory: "validation", failureCode: "missing_email" }
    );
    expect(providerClient.createCharge).not.toHaveBeenCalled();
  });

  it("handles invalid token family", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "ype_123");

    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "failed", expect.any(Date), { failureCategory: "validation", failureCode: "invalid_token_family" }
    );
    expect(providerClient.createCharge).not.toHaveBeenCalled();
  });

  it("handles expired order", async () => {
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 1);
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue({ ...baseOrder, expiresAt: expiredDate });
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "failed", expect.any(Date), { failureCategory: "validation", failureCode: "order_expired" }
    );
    expect(providerClient.createCharge).not.toHaveBeenCalled();
  });

  it("stops if attempt claim fails (concurrent execution)", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(false);

    await service.executeCharge("att_1", "tkn_123");

    expect(providerClient.createCharge).not.toHaveBeenCalled();
  });

  it("Order changes after initial Attempt lookup but before TX1: TX1 reload is authoritative", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    // Reloaded order inside TX1 is already expired (or missing email)
    ordersMock.findByIdForUpdate.mockResolvedValue({ ...baseOrder, status: "paid" });
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "failed", expect.any(Date), { failureCategory: "validation", failureCode: "invalid_order_status" }
    );
    expect(providerClient.createCharge).not.toHaveBeenCalled();
  });

  it("TX1 fresh Order data is used to create provider command", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    // Reloaded order inside TX1 has fresh amounts
    ordersMock.findByIdForUpdate.mockResolvedValue({ ...baseOrder, amountMinor: 2000, customerEmail: "fresh@test.com" });
    attemptsMock.claimAttempt.mockResolvedValue(true);

    providerClient.createCharge.mockResolvedValue({
      providerPaymentId: "chr_123",
      amountMinor: 2000,
      currency: "PEN",
      providerState: "success",
    });

    ordersMock.finalizePaidFromAwaitingPayment.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "tkn_123");

    expect(providerClient.createCharge).toHaveBeenCalledWith({
      amountMinor: 2000,
      currency: "PEN",
      customerEmail: "fresh@test.com",
      sourceToken: "tkn_123",
      metadataCorrelation: "op_1",
    });
  });

  it("processes success correctly", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);

    providerClient.createCharge.mockResolvedValue({
      providerPaymentId: "chr_123",
      amountMinor: 1000,
      currency: "PEN",
      providerState: "success",
    });

    ordersMock.finalizePaidFromAwaitingPayment.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.assignProviderPaymentId).toHaveBeenCalledWith("att_1", "chr_123", expect.any(Date));
    expect(ordersMock.finalizePaidFromAwaitingPayment).toHaveBeenCalledWith("ord_1", expect.objectContaining({
      provider: "culqi",
      paymentMethod: "card",
      providerPaymentId: "chr_123",
    }));
    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith("att_1", "succeeded", expect.any(Date));
  });

  it("Attempt loses processing state before SUCCESS TX2: conditional transition fails, transaction throws reconciliation error", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);

    providerClient.createCharge.mockResolvedValue({
      providerPaymentId: "chr_123",
      amountMinor: 1000,
      currency: "PEN",
      providerState: "success",
    });

    ordersMock.finalizePaidFromAwaitingPayment.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(false); // loses processing state

    await expect(service.executeCharge("att_1", "tkn_123")).rejects.toThrow(PaymentChargeReconciliationError);
  });

  it("Attempt loses processing state before DECLINE TX2: transaction throws", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);

    providerClient.createCharge.mockRejectedValue(new CulqiDeclineError("Decline", "insufficient_funds", "51", "chr_declined123"));

    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(false); // loses processing state

    await expect(service.executeCharge("att_1", "tkn_123")).rejects.toThrow(PaymentChargeReconciliationError);
  });

  it("Attempt loses processing state before AMBIGUOUS TX2: transaction throws", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);
    ordersMock.markProcessingFromAwaitingPayment.mockResolvedValue(true);

    providerClient.createCharge.mockRejectedValue(new CulqiTimeoutError());

    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(false); // loses processing state

    await expect(service.executeCharge("att_1", "tkn_123")).rejects.toThrow(PaymentChargeReconciliationError);
  });

  it("handles provider decline with charge_id preservation", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);

    providerClient.createCharge.mockRejectedValue(new CulqiDeclineError("Decline", "insufficient_funds", "51", "chr_declined123"));

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.assignProviderPaymentId).toHaveBeenCalledWith("att_1", "chr_declined123", expect.any(Date));
    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "failed", expect.any(Date), { failureCategory: "customer_decline", failureCode: "insufficient_funds" }
    );
    expect(ordersMock.finalizePaidFromAwaitingPayment).not.toHaveBeenCalled();
    expect(ordersMock.markProcessingFromAwaitingPayment).not.toHaveBeenCalled();
  });

  it("handles timeout/ambiguity", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);
    ordersMock.markProcessingFromAwaitingPayment.mockResolvedValue(true);

    providerClient.createCharge.mockRejectedValue(new CulqiTimeoutError());

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "indeterminate", expect.any(Date), { failureCategory: "unknown", failureCode: "ambiguous" }
    );
    expect(ordersMock.markProcessingFromAwaitingPayment).toHaveBeenCalledWith("ord_1", expect.any(Date));
  });

  it("handles known charge_id preservation during ambiguous outcome", async () => {
    attemptsMock.findById.mockResolvedValue(baseAttempt);
    ordersMock.findByIdForUpdate.mockResolvedValue(baseOrder);
    attemptsMock.claimAttempt.mockResolvedValue(true);
    attemptsMock.transitionStatusFromProcessing.mockResolvedValue(true);
    ordersMock.markProcessingFromAwaitingPayment.mockResolvedValue(true);

    providerClient.createCharge.mockRejectedValue(new CulqiReconciliationError("Ambiguous", "chr_weird123"));

    await service.executeCharge("att_1", "tkn_123");

    expect(attemptsMock.assignProviderPaymentId).toHaveBeenCalledWith("att_1", "chr_weird123", expect.any(Date));
    expect(attemptsMock.transitionStatusFromProcessing).toHaveBeenCalledWith(
      "att_1", "indeterminate", expect.any(Date), { failureCategory: "unknown", failureCode: "ambiguous" }
    );
    expect(ordersMock.markProcessingFromAwaitingPayment).toHaveBeenCalledWith("ord_1", expect.any(Date));
  });
});
