import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { PaymentCheckoutSessionService, PaymentOrderNotEligibleForCheckoutError } from "@/lib/payments/payment-checkout-session-service";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";
import { getDatabase } from "@/database/client";
import { PaymentOrderNotFoundError } from "@/lib/payments/payment-service";
import { z } from "zod";

const IdParamSchema = z.string().uuid();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authorizeAdminPaymentsWrite();

    if (authResult.kind === "unauthenticated") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    if (
      authResult.kind === "capability_missing" ||
      authResult.kind === "operator_not_mapped" ||
      authResult.kind === "operator_inactive"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (authResult.kind === "authorization_unavailable") {
      return NextResponse.json({ error: "Service Unavailable" }, { status: 503 });
    }

    const { id: orderId } = await params;

    const parsedId = IdParamSchema.safeParse(orderId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid Order ID" }, { status: 400 });
    }

    const uow = new PostgresPaymentUnitOfWork(getDatabase());
    const service = new PaymentCheckoutSessionService(uow);

    let sessionResult;
    try {
      sessionResult = await service.createCheckoutSessionForPaymentOrder(orderId);
    } catch (error) {
      if (error instanceof PaymentOrderNotFoundError) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({
      sessionId: sessionResult.sessionId,
      token: sessionResult.token,
      expiresAt: sessionResult.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error instanceof PaymentOrderNotEligibleForCheckoutError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
