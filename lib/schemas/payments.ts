import { z } from "zod";

export const paymentOrderStatusSchema = z.enum([
  "draft",
  "awaiting_payment",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

export type PaymentOrderStatus = z.infer<typeof paymentOrderStatusSchema>;

export const paymentProviderSchema = z.enum(["culqi"]);

export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const paymentMethodSchema = z.enum(["card", "yape"]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const currencySchema = z.enum(["PEN"]);

export type Currency = z.infer<typeof currencySchema>;

export const paymentOrderSchema = z
  .object({
    id: z.string().uuid(),
    serviceId: z.string().min(1),
    subOfferId: z.string().nullable(),
    customerReference: z.string().min(1),
    quoteReference: z.string().nullable(),
    amountMinor: z.number().int().positive(),
    currency: currencySchema,
    provider: paymentProviderSchema.nullable(),
    providerOrderId: z.string().nullable(),
    providerPaymentId: z.string().nullable(),
    paymentMethod: paymentMethodSchema.nullable(),
    status: paymentOrderStatusSchema,
    idempotencyKey: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date(),
    paidAt: z.date().nullable(),
    failedAt: z.date().nullable(),
    cancelledAt: z.date().nullable(),
    refundedAt: z.date().nullable(),
    expiresAt: z.date().nullable(),
    expiredAt: z.date().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // draft state rule: paymentMethod must be null initially
    if (data.status === "draft" && data.paymentMethod !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Payment method must be null when order is in draft state.",
      });
    }

    // paid status rules
    if (data.status === "paid") {
      if (data.paidAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["paidAt"],
          message: "paidAt MUST NOT be null when status is paid.",
        });
      }
    } else if (data.status !== "refunded") {
      if (data.paidAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["paidAt"],
          message: "paidAt MUST be null when status is not paid or refunded.",
        });
      }
    }

    // refunded status rules
    if (data.status === "refunded") {
      if (data.paidAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["paidAt"],
          message: "paidAt MUST NOT be null when status is refunded.",
        });
      }
      if (data.refundedAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["refundedAt"],
          message: "refundedAt MUST NOT be null when status is refunded.",
        });
      }
    } else {
      if (data.refundedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["refundedAt"],
          message: "refundedAt MUST be null when status is not refunded.",
        });
      }
    }

    // failed status rules
    if (data.status === "failed") {
      if (data.failedAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["failedAt"],
          message: "failedAt MUST NOT be null when status is failed.",
        });
      }
    } else {
      if (data.failedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["failedAt"],
          message: "failedAt MUST be null when status is not failed.",
        });
      }
    }

    // cancelled status rules
    if (data.status === "cancelled") {
      if (data.cancelledAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["cancelledAt"],
          message: "cancelledAt MUST NOT be null when status is cancelled.",
        });
      }
    } else {
      if (data.cancelledAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["cancelledAt"],
          message: "cancelledAt MUST be null when status is not cancelled.",
        });
      }
    }

    // expired status rules
    if (data.status === "expired") {
      if (data.expiredAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["expiredAt"],
          message: "expiredAt MUST NOT be null when status is expired.",
        });
      }
    } else {
      if (data.expiredAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["expiredAt"],
          message: "expiredAt MUST be null when status is not expired.",
        });
      }
    }
  });

export type PaymentOrder = z.infer<typeof paymentOrderSchema>;
