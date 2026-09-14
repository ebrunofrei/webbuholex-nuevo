import { z } from "zod";
import { currencySchema } from "./payments";

export const paymentQuoteStatusSchema = z.enum([
  "draft",
  "approved",
  "rejected",
  "cancelled",
  "expired",
]);

export type PaymentQuoteStatus = z.infer<typeof paymentQuoteStatusSchema>;

export const paymentQuoteSchema = z
  .object({
    id: z.string().uuid(),
    serviceId: z.string().min(1),
    subOfferId: z.string().nullable(),
    customerReference: z.string().min(1),
    customerEmail: z.string().trim().email().max(254).nullable().optional(),
    amountMinor: z.number().int().positive(),
    currency: currencySchema,
    status: paymentQuoteStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date(),
    approvedAt: z.date().nullable(),
    rejectedAt: z.date().nullable(),
    cancelledAt: z.date().nullable(),
    expiresAt: z.date().nullable(),
    expiredAt: z.date().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // approved status rules
    if (data.status === "approved") {
      if (data.approvedAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["approvedAt"],
          message: "approvedAt MUST NOT be null when status is approved.",
        });
      }
    } else {
      if ((data.status === "draft" || data.status === "rejected") && data.approvedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["approvedAt"],
          message: "approvedAt MUST be null when status is draft or rejected.",
        });
      }
    }

    // rejected status rules
    if (data.status === "rejected") {
      if (data.rejectedAt === null) {
        ctx.addIssue({
          code: "custom",
          path: ["rejectedAt"],
          message: "rejectedAt MUST NOT be null when status is rejected.",
        });
      }
    } else {
      if (data.rejectedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["rejectedAt"],
          message: "rejectedAt MUST be null when status is not rejected.",
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

export type PaymentQuote = z.infer<typeof paymentQuoteSchema>;
