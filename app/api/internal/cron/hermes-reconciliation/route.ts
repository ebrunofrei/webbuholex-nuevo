/**
 * Hermes Post-Dispatch Orphan Reconciliation Internal Cron Route
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7D / HERMES-PROD-A3.7D-R2
 *
 * Secure internal HTTP host for automated periodic orphan reconciliation.
 * Thin HTTP adapter adhering strictly to Next.js App Router route export requirements.
 * Delegates to handleHermesReconciliationCronGet.
 */

import { NextResponse } from "next/server";
import { handleHermesReconciliationCronGet } from "@/lib/hermes/control/hermes-reconciliation-cron-handler";

export async function GET(request: Request): Promise<Response> {
  return handleHermesReconciliationCronGet(request);
}

export async function POST(): Promise<Response> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function PUT(): Promise<Response> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function DELETE(): Promise<Response> {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
