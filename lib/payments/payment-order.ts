import type { PaymentOrder, PaymentOrderStatus } from "@/lib/schemas/payments";

export const paymentOrderTransitions: Readonly<
  Record<PaymentOrderStatus, readonly PaymentOrderStatus[]>
> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["processing", "paid", "cancelled", "expired"],
  processing: ["paid", "awaiting_payment", "failed"],
  paid: ["refunded"],
  failed: [],
  cancelled: [],
  expired: [],
  refunded: [],
};

export function canTransitionPaymentOrder(
  currentStatus: PaymentOrderStatus,
  targetStatus: PaymentOrderStatus
): boolean {
  return paymentOrderTransitions[currentStatus].includes(targetStatus);
}

export function transitionPaymentOrder(
  order: PaymentOrder,
  targetStatus: PaymentOrderStatus,
  transitionDate: Date = new Date()
): PaymentOrder {
  if (!canTransitionPaymentOrder(order.status, targetStatus)) {
    throw new Error(
      `Cannot transition payment order from ${order.status} to ${targetStatus}.`
    );
  }

  const updatedOrder = { ...order, status: targetStatus, updatedAt: transitionDate };

  switch (targetStatus) {
    case "paid":
      updatedOrder.paidAt = transitionDate;
      break;
    case "failed":
      updatedOrder.failedAt = transitionDate;
      break;
    case "cancelled":
      updatedOrder.cancelledAt = transitionDate;
      break;
    case "refunded":
      updatedOrder.refundedAt = transitionDate;
      break;
    case "expired":
      updatedOrder.expiredAt = transitionDate;
      break;
  }

  return updatedOrder;
}
