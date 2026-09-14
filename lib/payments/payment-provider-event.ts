import type { PaymentProviderEvent, PaymentProviderEventStatus } from "@/lib/schemas/payments";
import { PaymentProviderEventStateTransitionError } from "./payment-errors";

export const paymentProviderEventTransitions: Readonly<
  Record<PaymentProviderEventStatus, readonly PaymentProviderEventStatus[]>
> = {
  received: ["processing"],
  processing: ["processed", "failed"],
  processed: [],
  failed: ["processing"],
};

export function canTransitionPaymentProviderEvent(
  currentStatus: PaymentProviderEventStatus,
  targetStatus: PaymentProviderEventStatus
): boolean {
  return paymentProviderEventTransitions[currentStatus].includes(targetStatus);
}

export function transitionPaymentProviderEvent(
  event: PaymentProviderEvent,
  targetStatus: PaymentProviderEventStatus,
  transitionDate: Date = new Date()
): PaymentProviderEvent {
  if (!canTransitionPaymentProviderEvent(event.status, targetStatus)) {
    throw new PaymentProviderEventStateTransitionError(
      `Cannot transition payment provider event from ${event.status} to ${targetStatus}.`
    );
  }

  const updatedEvent = { ...event, status: targetStatus };

  switch (targetStatus) {
    case "processing":
      updatedEvent.processingStartedAt = transitionDate;
      break;
    case "processed":
      updatedEvent.processedAt = transitionDate;
      break;
    case "failed":
      updatedEvent.failedAt = transitionDate;
      break;
  }

  return updatedEvent;
}
