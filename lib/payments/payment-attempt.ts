import type { PaymentAttempt, PaymentAttemptStatus } from "@/lib/schemas/payments";
import { PaymentAttemptStateTransitionError } from "./payment-errors";

export const paymentAttemptTransitions: Readonly<
  Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]>
> = {
  created: ["processing", "cancelled"],
  processing: ["succeeded", "failed", "indeterminate"],
  succeeded: [],
  failed: [],
  cancelled: [],
  indeterminate: ["succeeded", "failed"],
};

export function canTransitionPaymentAttempt(
  currentStatus: PaymentAttemptStatus,
  targetStatus: PaymentAttemptStatus
): boolean {
  return paymentAttemptTransitions[currentStatus].includes(targetStatus);
}

export function transitionPaymentAttempt(
  attempt: PaymentAttempt,
  targetStatus: PaymentAttemptStatus,
  transitionDate: Date = new Date()
): PaymentAttempt {
  if (!canTransitionPaymentAttempt(attempt.status, targetStatus)) {
    throw new PaymentAttemptStateTransitionError(
      `Cannot transition payment attempt from ${attempt.status} to ${targetStatus}.`
    );
  }

  const updatedAttempt = { ...attempt, status: targetStatus, updatedAt: transitionDate };

  switch (targetStatus) {
    case "processing":
      updatedAttempt.startedAt = transitionDate;
      break;
    case "succeeded":
      updatedAttempt.succeededAt = transitionDate;
      break;
    case "failed":
      updatedAttempt.failedAt = transitionDate;
      break;
    case "cancelled":
      updatedAttempt.cancelledAt = transitionDate;
      break;
    case "indeterminate":
      updatedAttempt.indeterminateAt = transitionDate;
      break;
  }

  return updatedAttempt;
}
