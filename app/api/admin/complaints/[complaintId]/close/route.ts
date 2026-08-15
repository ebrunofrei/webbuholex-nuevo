import { NextResponse } from "next/server";
import { authorizeAdminComplaintClose, executeAdminComplaintClose, CloseComplaintHttpSchema } from "@/lib/complaints/complaints-admin-http-runtime";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await params;
    const authResult = await authorizeAdminComplaintClose();
    if (authResult.kind !== "authorized") {
      if (authResult.kind === "unauthenticated") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = CloseComplaintHttpSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const result = await executeAdminComplaintClose(
      complaintId,
      parseResult.data,
      authResult.principal
    );

    switch (result.kind) {
      case "success":
        return NextResponse.json({ success: true }, { status: 200 });
      case "complaint_not_found":
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      case "complaint_stale_status":
        return NextResponse.json({ error: "Conflict" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "Service Unavailable" }, { status: 503 });
  }
}
