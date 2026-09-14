import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  PaymentCheckoutSessionService,
  CheckoutSessionNotFoundError,
  CheckoutSessionExpiredError,
  CheckoutSessionRevokedError,
  PaymentOrderNotEligibleForCheckoutError,
  InvalidCheckoutTokenFormatError,
} from "@/lib/payments/payment-checkout-session-service";
import { PaymentOrderNotFoundError } from "@/lib/payments/payment-service";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";
import { getDatabase } from "@/database/client";

const ResolveBodySchema = z
  .object({
    token: z.string().length(43).regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ResolveBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const uow = new PostgresPaymentUnitOfWork(getDatabase());
    const service = new PaymentCheckoutSessionService(uow);

    let result;
    try {
      result = await service.resolveCheckoutSession(parsed.data.token);
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof InvalidCheckoutTokenFormatError) {
          return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
        }
        if (
          error instanceof CheckoutSessionNotFoundError ||
          error instanceof CheckoutSessionExpiredError ||
          error instanceof CheckoutSessionRevokedError ||
          error instanceof PaymentOrderNotEligibleForCheckoutError ||
          error instanceof PaymentOrderNotFoundError
        ) {
          // Uniform failure response to avoid leaking token existence/state
          return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }
      }
      throw error;
    }

    return NextResponse.json(
      {
        serviceId: result.serviceId,
        subOfferId: result.subOfferId,
        amountMinor: result.amountMinor,
        currency: result.currency,
        checkoutSessionExpiresAt: result.checkoutSessionExpiresAt.toISOString(),
        paymentOrderExpiresAt: result.paymentOrderExpiresAt
          ? result.paymentOrderExpiresAt.toISOString()
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error resolving checkout session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
