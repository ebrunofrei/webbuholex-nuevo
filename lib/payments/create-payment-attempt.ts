import { randomUUID } from "crypto";
import { PaymentContext } from "./payment-repositories";
import { PaymentAttempt, PaymentMethod, PaymentProvider } from "../schemas/payments";
import { PaymentAttemptConflictError, PaymentAttemptCreationError } from "./payment-errors";
import { paymentAttemptSchema } from "../schemas/payments";

export async function createPaymentAttempt(
  context: PaymentContext,
  paymentOrderId: string,
  paymentMethod: PaymentMethod,
  operationKey: string
): Promise<PaymentAttempt> {
  // 1. Lock the PaymentOrder
  const order = await context.orders.findByIdForUpdate(paymentOrderId);
  if (!order) {
    throw new PaymentAttemptCreationError("PaymentOrder not found");
  }

  // 2. Validate eligibility
  if (order.status !== "awaiting_payment") {
    throw new PaymentAttemptCreationError(
      `PaymentOrder is not eligible for new attempts (status: ${order.status})`
    );
  }
  if (order.expiresAt && order.expiresAt <= new Date()) {
    throw new PaymentAttemptCreationError("PaymentOrder is expired");
  }

  // 3. Check idempotent operation key
  const existingAttempt = await context.attempts.findByOperationKey(operationKey);
  const provider: PaymentProvider = "culqi";

  if (existingAttempt) {
    if (
      existingAttempt.paymentOrderId === paymentOrderId &&
      existingAttempt.paymentMethod === paymentMethod &&
      existingAttempt.provider === provider
    ) {
      return existingAttempt; // Canonical existing attempt
    } else {
      throw new PaymentAttemptConflictError(
        "operationKey already used for a conflicting creation intent"
      );
    }
  }

  // 4. Compute next attempt number
  const latestAttempt = await context.attempts.findLatestByPaymentOrderId(paymentOrderId);
  const nextAttemptNumber = latestAttempt ? latestAttempt.attemptNumber + 1 : 1;

  // 5. Create PaymentAttempt
  const attempt = paymentAttemptSchema.parse({
    id: randomUUID(),
    paymentOrderId,
    attemptNumber: nextAttemptNumber,
    operationKey,
    provider,
    paymentMethod,
    providerPaymentId: null,
    status: "created",
    failureCategory: null,
    failureCode: null,
    createdAt: new Date(),
    startedAt: null,
    succeededAt: null,
    failedAt: null,
    cancelledAt: null,
    indeterminateAt: null,
    updatedAt: new Date(),
  });

  // 6. Insert PaymentAttempt
  await context.attempts.insert(attempt);

  return attempt;
}
