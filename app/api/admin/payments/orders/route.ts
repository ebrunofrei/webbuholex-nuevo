import { NextResponse } from "next/server";
import { authorizeAdminPaymentsWrite, CreatePaymentOrderHttpSchema, mapPaymentOrderToAdminDto } from "@/lib/payments/payments-admin-http-runtime";
import { PaymentService, PaymentQuoteNotFoundError, PaymentQuoteNotApprovedError, PaymentQuoteExpiredError, PaymentOrderReconciliationError } from "@/lib/payments/payment-service";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authResult = await authorizeAdminPaymentsWrite();

    if (authResult.kind === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: { code: "unauthorized" } },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    if (
      authResult.kind === "operator_not_mapped" ||
      authResult.kind === "operator_inactive" ||
      authResult.kind === "capability_missing"
    ) {
      return NextResponse.json(
        { success: false, error: { code: "forbidden" } },
        { status: 403, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    if (authResult.kind === "authorization_unavailable") {
      return NextResponse.json(
        { success: false, error: { code: "service_unavailable" } },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = CreatePaymentOrderHttpSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request", details: parsedBody.error.format() } },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    const { quoteId } = parsedBody.data;

    const uow = new PostgresPaymentUnitOfWork();
    const service = new PaymentService(uow);

    const order = await service.createPaymentOrderFromApprovedQuote(quoteId);

    return NextResponse.json(
      mapPaymentOrderToAdminDto(order),
      { status: 201, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof PaymentQuoteNotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "not_found", message: error.message } },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }
    if (error instanceof PaymentQuoteNotApprovedError || error instanceof PaymentQuoteExpiredError) {
      return NextResponse.json(
        { success: false, error: { code: "conflict", message: error.message } },
        { status: 409, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }
    if (error instanceof PaymentOrderReconciliationError) {
      return NextResponse.json(
        { success: false, error: { code: "internal_server_error", message: "Reconciliation error" } },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    console.error("ROUTE ERROR:", error);
    return NextResponse.json(
      { success: false, error: { code: "internal_server_error" } },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
    );
  }
}
