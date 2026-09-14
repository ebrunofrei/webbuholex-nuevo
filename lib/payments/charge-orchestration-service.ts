import { PaymentAttemptFailureCategory } from "../schemas/payments";
import { UnitOfWork } from "./payment-repositories";
import { PaymentProviderClient, CreateChargeCommand, NormalizedChargeResponse } from "./payment-provider-client";
import {
  CulqiAuthenticationError,
  CulqiDeclineError,
  CulqiRateLimitError,
  CulqiValidationError,
  CulqiReconciliationError,
} from "./culqi-errors";
import { PaymentChargeReconciliationError } from "./payment-service";

export class ChargeOrchestrationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly providerClient: PaymentProviderClient
  ) {}

  async executeCharge(attemptId: string, sourceToken: string, now: Date = new Date()): Promise<void> {
    // 1. Initial dirty read to exit early if already processed
    const attemptInfo = await this.uow.execute(async ({ attempts }) => {
      return attempts.findById(attemptId);
    });

    if (!attemptInfo) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    if (attemptInfo.status !== "created") {
      return;
    }

    // TX1: Atomic claim and authoritative Preflight validation
    const tx1Result = await this.uow.execute(async ({ attempts, orders }) => {
      const isClaimed = await attempts.claimAttempt(attemptId, now);
      if (!isClaimed) {
        return { success: false, reason: "concurrent_claim" };
      }

      // Reload fresh Order inside TX1
      const order = await orders.findByIdForUpdate(attemptInfo.paymentOrderId);
      if (!order) {
        throw new PaymentChargeReconciliationError(`Order ${attemptInfo.paymentOrderId} not found during attempt claim`);
      }

      // We are now in 'processing' state. Authoritative Preflight checks:
      if (order.status !== "awaiting_payment") {
        const updated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "validation",
          failureCode: "invalid_order_status",
        });
        if (!updated) throw new PaymentChargeReconciliationError("Could not transition attempt to failed during preflight");
        return { success: false, reason: "preflight" };
      }

      if (order.expiresAt && order.expiresAt <= now) {
        const updated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "validation",
          failureCode: "order_expired",
        });
        if (!updated) throw new PaymentChargeReconciliationError("Could not transition attempt to failed during preflight");
        return { success: false, reason: "preflight" };
      }

      if (!order.customerEmail) {
        const updated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "validation",
          failureCode: "missing_email",
        });
        if (!updated) throw new PaymentChargeReconciliationError("Could not transition attempt to failed during preflight");
        return { success: false, reason: "preflight" };
      }

      if (attemptInfo.paymentMethod === "card" && !sourceToken.startsWith("tkn_")) {
        const updated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "validation",
          failureCode: "invalid_token_family",
        });
        if (!updated) throw new PaymentChargeReconciliationError("Could not transition attempt to failed during preflight");
        return { success: false, reason: "preflight" };
      }

      if (attemptInfo.paymentMethod === "yape" && !sourceToken.startsWith("ype_")) {
        const updated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "validation",
          failureCode: "invalid_token_family",
        });
        if (!updated) throw new PaymentChargeReconciliationError("Could not transition attempt to failed during preflight");
        return { success: false, reason: "preflight" };
      }

      // Return the validated snapshot to build the provider command safely outside TX1
      return {
        success: true,
        snapshot: {
          orderId: order.id,
          amountMinor: order.amountMinor,
          currency: order.currency,
          customerEmail: order.customerEmail,
          paymentMethod: attemptInfo.paymentMethod,
          operationKey: attemptInfo.operationKey,
        },
      };
    });

    if (!tx1Result.success || !tx1Result.snapshot) {
      return;
    }

    // Build command from authoritative snapshot
    const snapshot = tx1Result.snapshot;
    const command: CreateChargeCommand = {
      amountMinor: snapshot.amountMinor,
      currency: snapshot.currency,
      customerEmail: snapshot.customerEmail,
      sourceToken,
      metadataCorrelation: snapshot.operationKey,
    };

    // HTTP Request
    let response: NormalizedChargeResponse | null = null;
    try {
      response = await this.providerClient.createCharge(command);
    } catch (error: any) {
      await this.handleProviderError(attemptId, snapshot.orderId, error, now);
      return;
    }

    // TX2: Finalize
    await this.uow.execute(async ({ attempts, orders }) => {
      await attempts.assignProviderPaymentId(attemptId, response.providerPaymentId, now);

      if (response.providerState === "success") {
        // SUCCESS TX2
        const orderUpdated = await orders.finalizePaidFromAwaitingPayment(snapshot.orderId, {
          provider: "culqi",
          paymentMethod: snapshot.paymentMethod,
          providerPaymentId: response.providerPaymentId,
          paidAt: now,
        });

        if (!orderUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not finalize order to paid. Invariant lost.");
        }

        const attemptUpdated = await attempts.transitionStatusFromProcessing(attemptId, "succeeded", now);
        if (!attemptUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not transition attempt to succeeded. Invariant lost.");
        }
      } else {
        const attemptUpdated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "unknown",
          failureCode: response.providerResponseCode,
        });
        if (!attemptUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not transition attempt to failed. Invariant lost.");
        }
      }
    });
  }

  private async handleProviderError(attemptId: string, orderId: string, error: any, now: Date) {
    await this.uow.execute(async ({ attempts, orders }) => {
      if (
        error instanceof CulqiAuthenticationError ||
        error instanceof CulqiValidationError ||
        error instanceof CulqiDeclineError
      ) {
        if (error instanceof CulqiDeclineError && error.providerPaymentId) {
          await attempts.assignProviderPaymentId(attemptId, error.providerPaymentId, now);
        }

        let category: PaymentAttemptFailureCategory = "provider_rejection";
        if (error instanceof CulqiDeclineError) category = "customer_decline";
        if (error instanceof CulqiValidationError) category = "validation";

        const attemptUpdated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: category,
          failureCode: error.code || "unknown",
        });

        if (!attemptUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not transition attempt to failed. Invariant lost.");
        }
      } else if (error instanceof CulqiRateLimitError) {
        const attemptUpdated = await attempts.transitionStatusFromProcessing(attemptId, "failed", now, {
          failureCategory: "provider_unavailable",
          failureCode: "rate_limit",
        });

        if (!attemptUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not transition attempt to failed. Invariant lost.");
        }
      } else {
        // Ambiguous Outcome
        if (error instanceof CulqiReconciliationError && error.providerPaymentId) {
           await attempts.assignProviderPaymentId(attemptId, error.providerPaymentId, now);
        }

        const attemptUpdated = await attempts.transitionStatusFromProcessing(attemptId, "indeterminate", now, {
          failureCategory: "unknown",
          failureCode: "ambiguous",
        });

        if (!attemptUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not transition attempt to indeterminate. Invariant lost.");
        }

        const orderUpdated = await orders.markProcessingFromAwaitingPayment(orderId, now);
        if (!orderUpdated) {
          throw new PaymentChargeReconciliationError("Reconciliation Error: Could not mark order as processing. Invariant lost.");
        }
      }
    });
  }
}
