import { NextResponse } from "next/server";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { getDatabase } from "@/database/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const authResult = await authorizeAdminPaymentsWrite();
  if (authResult.kind !== "authorized") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  let stage = "client_init";
  try {
    const db = getDatabase();

    stage = "identity_query";
    const result = await db.execute<{ currentUser: string, sessionUser: string }>(sql`
      SELECT current_user AS "currentUser", session_user AS "sessionUser"
    `);

    if (result.length === 0) {
      throw new Error("Empty result");
    }

    return NextResponse.json({
      currentUser: result[0]!.currentUser,
      sessionUser: result[0]!.sessionUser,
    }, { status: 200 });

  } catch (err: unknown) {
    let classification = "unknown";

    if (typeof err === "object" && err !== null && "code" in err) {
      const candidateCode = (err as { code?: unknown }).code;

      if (typeof candidateCode === "string") {
        const nodeCodeAllowlist: Record<string, string> = {
          ENOTFOUND: "dns_failure",
          EAI_AGAIN: "dns_failure",
          ECONNREFUSED: "connection_refused",
          ECONNRESET: "connection_reset",
          ETIMEDOUT: "connection_timeout",
        };

        const nodeClassification = nodeCodeAllowlist[candidateCode];

        if (nodeClassification !== undefined) {
          classification = nodeClassification;
        } else if (/^[0-9A-Z]{5}$/.test(candidateCode)) {
          const sqlStateAllowlist: Record<string, string> = {
            "28P01": "invalid_authorization",
            "28000": "invalid_authorization",
            "57P03": "cannot_connect_now",
            "3D000": "invalid_database",
            "42501": "insufficient_privilege",
            "42P01": "undefined_table",
            "23514": "check_violation",
            "23502": "not_null_violation",
            "23505": "unique_violation",
            "22P02": "invalid_text_representation",
          };

          const sqlStateClassification =
            sqlStateAllowlist[candidateCode];

          if (sqlStateClassification !== undefined) {
            classification = sqlStateClassification;
          } else if (candidateCode.startsWith("08")) {
            classification = "connection_exception";
          } else if (candidateCode.startsWith("28")) {
            classification = "invalid_authorization";
          }
        }
      }
    }

    console.error(
      `DATABASE DIAGNOSTIC FAILED: ${stage} / ${classification}`,
    );

    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 },
    );
  }
}
