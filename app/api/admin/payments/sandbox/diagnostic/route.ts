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

  try {
    const db = getDatabase();

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

  } catch (err: any) {
    if (err && typeof err.code === "string") {
      const allowlist: Record<string, string> = {
        "42501": "insufficient_privilege",
        "42P01": "undefined_table",
        "23514": "check_violation",
        "23502": "not_null_violation",
        "23505": "unique_violation",
        "22P02": "invalid_text_representation"
      };
      const code = err.code as string;
      let classification = "unknown";
      if (allowlist[code]) classification = allowlist[code];
      else if (code.startsWith("08")) classification = "connection_exception";

      console.error(`DIAGNOSTIC QUERY FAILED: ${classification} (${code})`);
    } else {
      console.error(`DIAGNOSTIC QUERY FAILED: unknown error format`);
    }

    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}
