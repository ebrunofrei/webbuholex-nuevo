import "server-only";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { PaymentOrder } from "../schemas/payments";

export const CreatePaymentOrderHttpSchema = z.object({
  quoteId: z.string().uuid()
}).strict();

export type CreatePaymentOrderHttpPayload = z.infer<typeof CreatePaymentOrderHttpSchema>;

export interface PaymentOrderAdminDto {
  id: string;
  serviceId: string;
  subOfferId: string | null;
  customerReference: string;
  quoteReference: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  provider: string | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  expiredAt: string | null;
  refundedAt: string | null;
}

export function mapPaymentOrderToAdminDto(order: PaymentOrder): PaymentOrderAdminDto {
  return {
    id: order.id,
    serviceId: order.serviceId,
    subOfferId: order.subOfferId,
    customerReference: order.customerReference,
    quoteReference: order.quoteReference,
    amountMinor: order.amountMinor,
    currency: order.currency,
    status: order.status,
    provider: order.provider,
    providerOrderId: order.providerOrderId,
    providerPaymentId: order.providerPaymentId,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    failedAt: order.failedAt ? order.failedAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    expiredAt: order.expiredAt ? order.expiredAt.toISOString() : null,
    refundedAt: order.refundedAt ? order.refundedAt.toISOString() : null,
  };
}

export async function authorizeAdminPaymentsWrite(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "payments:write", repository);
}

export async function authorizeAdminPaymentsRead(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "payments:read", repository);
}
