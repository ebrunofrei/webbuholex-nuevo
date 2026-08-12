import { NextResponse } from "next/server";
import {
  authorizeAdminComplaintsRead,
  ListAdminComplaintsHttpQuerySchema,
} from "@/lib/complaints/complaints-admin-read-http-runtime";
import { listAdminComplaintsRuntime } from "@/lib/complaints/complaints-admin-read-runtime";
import { ComplaintsServiceUnavailableError } from "@/lib/complaints/complaints-errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const queryObj = Object.fromEntries(searchParams.entries());

    const parsedQuery = ListAdminComplaintsHttpQuerySchema.safeParse(queryObj);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request" } },
        { status: 400, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }

    const authResult = await authorizeAdminComplaintsRead();

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

    const principal = authResult.principal;

    const result = await listAdminComplaintsRuntime(parsedQuery.data, principal);

    switch (result.kind) {
      case "success":
        return NextResponse.json(
          result.data,
          { status: 200, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
        );
      case "invalid_cursor":
      case "invalid_limit":
      case "invalid_status":
        return NextResponse.json(
          { success: false, error: { code: "bad_request" } },
          { status: 400, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("database_configuration_missing") ||
       error.message.includes("database_configuration_invalid") ||
       error.message.includes("Connection") ||
       error.message.includes("connect") ||
       error.message.includes("ECONNREFUSED") ||
       error.message.includes("Network DB Error") || // typical mock error
       error.message.includes("unauthorized_capability"))
    ) {
        if (error.message.includes("unauthorized_capability")) {
            return NextResponse.json(
              { success: false, error: { code: "forbidden" } },
              { status: 403, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
            );
        }
        return NextResponse.json(
          { success: false, error: { code: "service_unavailable" } },
          { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
        );
    }

    if (error instanceof ComplaintsServiceUnavailableError) {
      return NextResponse.json(
        { success: false, error: { code: "service_unavailable" } },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_server_error" } },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json" } }
    );
  }
}
