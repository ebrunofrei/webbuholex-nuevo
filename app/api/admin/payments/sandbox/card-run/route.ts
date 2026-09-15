import { NextResponse } from "next/server";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";
import { PaymentService } from "@/lib/payments/payment-service";
import { PaymentQuote } from "@/lib/schemas/payment-quotes";
import { v4 as uuidv4 } from "uuid";
import { createPaymentAttempt } from "@/lib/payments/create-payment-attempt";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const authResult = await authorizeAdminPaymentsWrite();
  if (authResult.kind !== "authorized") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const now = new Date();
    const quoteId = uuidv4();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day

    const quote: PaymentQuote = {
      id: quoteId,
      serviceId: "sandbox-e2e-card",
      subOfferId: null,
      customerReference: "sandbox-customer",
      customerEmail: "e2e-culqi-sandbox@buholex.com",
      amountMinor: 500, // 5.00 PEN (Verified)
      currency: "PEN",
      status: "approved",
      createdAt: now,
      updatedAt: now,
      approvedAt: now,
      rejectedAt: null,
      cancelledAt: null,
      expiresAt: expiresAt,
      expiredAt: null,
    };

    // 1. Create quote
    const uow1 = new PostgresPaymentUnitOfWork();
    await uow1.execute(async ({ quotes }) => {
      await quotes.save(quote);
    });

    // 2. Create order
    const uow2 = new PostgresPaymentUnitOfWork();
    const service = new PaymentService(uow2);
    const order = await service.createPaymentOrderFromApprovedQuote(quoteId, now);

    // 3. Create attempt
    const operationKey = `sandbox-op-${uuidv4()}`;
    const uow3 = new PostgresPaymentUnitOfWork();
    const attempt = await uow3.execute(async (context) => {
      return await createPaymentAttempt(context, order.id, "card", operationKey);
    });

    return NextResponse.json({
      quoteId: quote.id,
      orderId: order.id,
      attemptId: attempt.id,
      amountMinor: order.amountMinor,
      currency: order.currency,
      status: attempt.status,
    }, { status: 201 });
  } catch (err: unknown) {
    // Avoid logging DB/internal error objects
    console.error("SANDBOX PREPARE ERROR: An internal error occurred preparing the run.");
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
