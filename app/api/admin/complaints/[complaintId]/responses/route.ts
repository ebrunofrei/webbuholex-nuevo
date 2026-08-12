import { NextResponse } from "next/server";
import {
  authorizeAdminComplaintResponse,
  executeAdminComplaintResponse,
  ProviderResponseHttpSchema,
} from "@/lib/complaints/complaints-admin-http-runtime";
import { ComplaintsServiceUnavailableError } from "@/lib/complaints/complaints-errors";

export const runtime = "nodejs";

const MAX_COMPLAINTS_BODY_BYTES = 65536;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ complaintId: string }> }
) {
  try {
    const origin = request.headers.get("origin");
    if (origin !== null) {
      if (origin === "null") {
        return NextResponse.json(
          { success: false, error: { code: "forbidden" } },
          { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      }
      try {
        const originUrl = new URL(origin);
        const requestUrl = new URL(request.url);
        const hostHeader = request.headers.get("host");

        if (originUrl.origin !== requestUrl.origin) {
          return NextResponse.json(
            { success: false, error: { code: "forbidden" } },
            { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
          );
        }
        if (hostHeader !== null && originUrl.host !== hostHeader) {
          return NextResponse.json(
            { success: false, error: { code: "forbidden" } },
            { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: { code: "forbidden" } },
          { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: { code: "forbidden" } },
        { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const mediaType = contentType.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "application/json") {
      return NextResponse.json(
        { success: false, error: { code: "unsupported_media_type" } },
        { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_COMPLAINTS_BODY_BYTES) {
        return NextResponse.json(
          { success: false, error: { code: "payload_too_large" } },
          { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      }
    }

    const authResult = await authorizeAdminComplaintResponse();

    if (authResult.kind === "unauthenticated") {
      return NextResponse.json(
        { success: false, error: { code: "unauthorized" } },
        { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    if (
      authResult.kind === "operator_not_mapped" ||
      authResult.kind === "operator_inactive" ||
      authResult.kind === "capability_missing"
    ) {
      return NextResponse.json(
        { success: false, error: { code: "forbidden" } },
        { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    if (authResult.kind === "authorization_unavailable") {
      return NextResponse.json(
        { success: false, error: { code: "service_unavailable" } },
        { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    const principal = authResult.principal;

    const { complaintId } = await params;
    if (!/^[a-zA-Z0-9-_]{8,64}$/.test(complaintId)) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request" } },
        { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    let bodyLength = 0;
    const chunks: Uint8Array[] = [];

    if (request.body) {
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bodyLength += value.byteLength;
            if (bodyLength > MAX_COMPLAINTS_BODY_BYTES) {
              return NextResponse.json(
                { success: false, error: { code: "payload_too_large" } },
                { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
              );
            }
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    let jsonBody: unknown;
    if (bodyLength === 0) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request" } },
        { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    try {
      const totalBuffer = new Uint8Array(bodyLength);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const bodyText = new TextDecoder("utf-8", { fatal: true }).decode(totalBuffer);
      jsonBody = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "bad_request" } },
        { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    const parsed = ProviderResponseHttpSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "bad_request" } },
        { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }

    const result = await executeAdminComplaintResponse(complaintId, parsed.data, principal);

    switch (result.kind) {
      case "success":
        return NextResponse.json(
          { success: true },
          { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      case "complaint_not_found":
        return NextResponse.json(
          { success: false, error: { code: "not_found" } },
          { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      case "complaint_stale_status":
      case "complaint_initial_response_already_exists":
        return NextResponse.json(
          { success: false, error: { code: "conflict" } },
          { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
      case "complaint_domain_error":
        return NextResponse.json(
          { success: false, error: { code: "validation_failed" } },
          { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    if (error instanceof ComplaintsServiceUnavailableError) {
      return NextResponse.json(
        { success: false, error: { code: "service_unavailable" } },
        { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_server_error" } },
      { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  }
}
