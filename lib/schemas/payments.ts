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
    customerEmail: z.string().trim().email().max(254).nullable().optional(),
    quoteReference: z.string().uuid().nullable(),
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

export const paymentCheckoutSessionStatusSchema = z.enum([
  "active",
  "revoked",
  "expired",
]);

export type PaymentCheckoutSessionStatus = z.infer<
  typeof paymentCheckoutSessionStatusSchema
>;

export const paymentCheckoutSessionSchema = z
  .object({
    id: z.string().uuid(),
    paymentOrderId: z.string().uuid(),
    tokenHash: z.string().length(64).regex(/^[0-9a-f]{64}$/),
    status: paymentCheckoutSessionStatusSchema,
    expiresAt: z.date(),
    createdAt: z.date(),
    revokedAt: z.date().nullable(),
    expiredAt: z.date().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // revoked status rules
    if (data.status === "revoked") {
      if (data.revokedAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["revokedAt"],
          message: "revokedAt MUST NOT be null when status is revoked.",
        });
      }
    } else {
      if (data.revokedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["revokedAt"],
          message: "revokedAt MUST be null when status is not revoked.",
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

export type PaymentCheckoutSession = z.infer<
  typeof paymentCheckoutSessionSchema
>;

export const paymentAttemptStatusSchema = z.enum([
  "created",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "indeterminate",
]);

export type PaymentAttemptStatus = z.infer<typeof paymentAttemptStatusSchema>;

export const paymentAttemptFailureCategorySchema = z.enum([
  "customer_decline",
  "validation",
  "provider_rejection",
  "provider_unavailable",
  "network",
  "timeout",
  "internal",
  "unknown",
]);

export type PaymentAttemptFailureCategory = z.infer<
  typeof paymentAttemptFailureCategorySchema
>;

export const paymentAttemptSchema = z
  .object({
    id: z.string().uuid(),
    paymentOrderId: z.string().uuid(),
    attemptNumber: z.number().int().positive(),
    operationKey: z.string().trim().min(1),
    provider: paymentProviderSchema,
    paymentMethod: paymentMethodSchema,
    providerPaymentId: z.string().nullable(),
    status: paymentAttemptStatusSchema,
    failureCategory: paymentAttemptFailureCategorySchema.nullable(),
    failureCode: z.string().trim().min(1).nullable(),
    createdAt: z.date(),
    startedAt: z.date().nullable(),
    succeededAt: z.date().nullable(),
    failedAt: z.date().nullable(),
    cancelledAt: z.date().nullable(),
    indeterminateAt: z.date().nullable(),
    updatedAt: z.date(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "processing" && data.startedAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["startedAt"],
        message: "startedAt MUST NOT be null when status is processing or beyond.",
      });
    }
    if (data.status === "succeeded" && data.succeededAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["succeededAt"],
        message: "succeededAt MUST NOT be null when status is succeeded.",
      });
    }
    if (data.status === "failed" && data.failedAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["failedAt"],
        message: "failedAt MUST NOT be null when status is failed.",
      });
    }
    if (data.status === "cancelled" && data.cancelledAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["cancelledAt"],
        message: "cancelledAt MUST NOT be null when status is cancelled.",
      });
    }
    if (data.status === "cancelled" && data.startedAt !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["startedAt"],
        message: "startedAt MUST be null when status is cancelled.",
      });
    }
    if (data.status === "created" && data.startedAt !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["startedAt"],
        message: "startedAt MUST be null when status is created.",
      });
    }
    if (data.status === "indeterminate" && data.indeterminateAt === null) {
      ctx.addIssue({
        code: "custom",
        path: ["indeterminateAt"],
        message: "indeterminateAt MUST NOT be null when status is indeterminate.",
      });
    }
  });

export type PaymentAttempt = z.infer<typeof paymentAttemptSchema>;

export const paymentProviderEventStatusSchema = z.enum([
  "received",
  "processing",
  "processed",
  "failed",
]);

export type PaymentProviderEventStatus = z.infer<
  typeof paymentProviderEventStatusSchema
>;

export const paymentProviderEventSchema = z
  .object({
    id: z.string().uuid(),
    provider: paymentProviderSchema,
    providerEventId: z.string().trim().min(1).nullable(),
    deduplicationKey: z.string().trim().min(1),
    providerObjectId: z.string().trim().min(1).nullable(),
    paymentOrderId: z.string().uuid().nullable(),
    paymentAttemptId: z.string().uuid().nullable(),
    eventType: z.string().trim().min(1),
    payloadHash: z.string().length(64).regex(/^[0-9a-f]{64}$/),
    status: paymentProviderEventStatusSchema,
    receivedAt: z.date(),
    processingStartedAt: z.date().nullable(),
    processedAt: z.date().nullable(),
    failedAt: z.date().nullable(),
    failureCode: z.string().trim().min(1).nullable(),
    createdAt: z.date(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "received") {
      if (data.processingStartedAt !== null) {
        ctx.addIssue({ code: "custom", path: ["processingStartedAt"], message: "MUST be null when received." });
      }
      if (data.processedAt !== null) {
        ctx.addIssue({ code: "custom", path: ["processedAt"], message: "MUST be null when received." });
      }
    } else {
      if (data.processingStartedAt === null) {
        ctx.addIssue({ code: "custom", path: ["processingStartedAt"], message: "MUST NOT be null when processing or beyond." });
      }
    }

    if (data.status === "processed" && data.processedAt === null) {
      ctx.addIssue({ code: "custom", path: ["processedAt"], message: "MUST NOT be null when processed." });
    }

    if (data.status === "failed" && data.failedAt === null) {
      ctx.addIssue({ code: "custom", path: ["failedAt"], message: "MUST NOT be null when failed." });
    }
  });

export type PaymentProviderEvent = z.infer<typeof paymentProviderEventSchema>;
