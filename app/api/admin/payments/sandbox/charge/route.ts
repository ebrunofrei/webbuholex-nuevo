import { NextResponse } from "next/server";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { PostgresPaymentUnitOfWork } from "@/lib/payments/postgres-payment-unit-of-work";
import { ChargeOrchestrationService } from "@/lib/payments/charge-orchestration-service";
import { CulqiProviderAdapter } from "@/lib/payments/culqi-provider-adapter";
import { z } from "zod";

export const runtime = "nodejs";

const chargeRequestSchema = z.object({
  attemptId: z.string().uuid(),
  sourceToken: z.string().startsWith("tkn_").max(100),
}).strict();

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const authResult = await authorizeAdminPaymentsWrite();
  if (authResult.kind !== "authorized") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = chargeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const { attemptId, sourceToken } = parsed.data;

    const uow = new PostgresPaymentUnitOfWork();

    // Instantiate real adapter. If tests run, they will mock it or its fetch.
    const providerClient = new CulqiProviderAdapter();
    const orchestration = new ChargeOrchestrationService(uow, providerClient);

    await orchestration.executeCharge(attemptId, sourceToken);

    // After orchestration, we need to return the attempt and order status.
    const attempt = await uow.execute(({ attempts }) => attempts.findById(attemptId));
    if (!attempt) {
       return NextResponse.json({ success: false, error: "Attempt not found" }, { status: 404 });
    }
    const order = await uow.execute(({ orders }) => orders.findById(attempt.paymentOrderId));

    let sanitizedResult = "succeeded";
    if (attempt.status === "failed") sanitizedResult = "failed";
    if (attempt.status === "indeterminate") sanitizedResult = "reconciliation_required";
    if (attempt.status === "created" || attempt.status === "processing") {
       // Ideally this shouldn't happen unless timeout
       sanitizedResult = "reconciliation_required";
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      orderId: order?.id,
      providerPaymentId: attempt.providerPaymentId,
      attemptStatus: attempt.status,
      orderStatus: order?.status,
      failureCategory: attempt.failureCategory,
      resultClass: sanitizedResult,
    });
  } catch (err: unknown) {
    // Avoid logging token or raw provider data
    console.error("SANDBOX CHARGE ERROR: An internal error occurred executing the charge.");
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
