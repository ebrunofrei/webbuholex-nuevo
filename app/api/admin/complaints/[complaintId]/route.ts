import { NextResponse, NextRequest } from "next/server";
import { getAdminComplaintDetailRuntime } from "@/lib/complaints/complaints-admin-detail-read-runtime";
import { authorizeAdminComplaintDetailRead } from "@/lib/complaints/complaints-admin-detail-read-http-runtime";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(complaintId)) {
      return NextResponse.json(
        { error: "malformed_identifier" },
        {
          status: 400,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    const authResult = await authorizeAdminComplaintDetailRead();
    if (authResult.kind === "unauthenticated") {
      return NextResponse.json(
        { error: "unauthenticated" },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    if (authResult.kind === "authorization_unavailable") {
      return NextResponse.json(
        { error: "authorization_unavailable" },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    if (authResult.kind !== "authorized") {
      return NextResponse.json(
        { error: "forbidden" },
        {
          status: 403,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    const result = await getAdminComplaintDetailRuntime(complaintId, authResult.principal);

    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "not_found" },
        {
          status: 404,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    if (result.kind === "db_unavailable") {
      return NextResponse.json(
        { error: "service_unavailable" },
        {
          status: 503,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    if (result.kind === "invalid_state" || result.kind === "unsupported_schema") {
      return NextResponse.json(
        { error: "internal_server_error" },
        {
          status: 500,
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
          },
        }
      );
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "internal_server_error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        },
      }
    );
  }
}
