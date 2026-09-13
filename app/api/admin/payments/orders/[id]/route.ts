import { NextResponse } from "next/server";
import { authorizeAdminPaymentsRead, mapPaymentOrderToAdminDto } from "@/lib/payments/payments-admin-http-runtime";
import { PaymentService, PaymentOrderNotFoundError } from "@/lib/payments/payment-service";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";
import { z } from "zod";

export const runtime = "nodejs";

const UuidParamSchema = z.string().uuid();

export async function GET(
  request: Request,
  context: any
) {
  const params = await Promise.resolve(context.params);
  try {
    const authResult = await authorizeAdminPaymentsRead();

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

    const parseResult = UuidParamSchema.safeParse(params.id);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request", message: "Invalid UUID format for order ID" } },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    const orderId = parseResult.data;

    const uow = new PostgresPaymentUnitOfWork();
    const service = new PaymentService(uow);

    const order = await service.getPaymentOrderById(orderId);

    return NextResponse.json(
      mapPaymentOrderToAdminDto(order),
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof PaymentOrderNotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "not_found", message: error.message } },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    console.error("ROUTE ERROR:", error);
    return NextResponse.json(
      { success: false, error: { code: "internal_server_error" } },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
    );
  }
}
