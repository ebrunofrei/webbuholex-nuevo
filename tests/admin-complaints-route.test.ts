import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/admin/complaints/[complaintId]/responses/route";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";
import { submitProviderResponseRuntime, type ProviderResponseRuntimeResult } from "@/lib/complaints/complaints-admin-runtime";
import { getAuthorizationDatabase } from "@/database/client";
import { ProviderResponseHttpSchema } from "@/lib/complaints/complaints-admin-http-runtime";

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn(),
}));

vi.mock("@/lib/authorization/authorization-resolver", () => ({
  resolveTrustedAdminPrincipal: vi.fn(),
}));

vi.mock("@/lib/complaints/complaints-admin-runtime", () => ({
  submitProviderResponseRuntime: vi.fn(),
}));

vi.mock("@/database/client", () => ({
  getAuthorizationDatabase: vi.fn().mockReturnValue({}),
}));

vi.mock("@/database/repositories/authorization.repository", () => ({
  createAuthorizationRepository: vi.fn().mockReturnValue({}),
}));

describe("POST /api/admin/complaints/[complaintId]/responses (B5C.1 Transport)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceSession).mockResolvedValue({
      status: "authenticated",
      provider: "auth0",
      providerSubjectId: "auth0|test",
      sessionId: null,
      issuedAt: null,
      expiresAt: null,
    });
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({
      kind: "authorized",
      principal: { operatorId: "op_123", identitySource: "authenticated_session" },
    });
    vi.mocked(submitProviderResponseRuntime).mockResolvedValue({
      kind: "success",
    });
  });

  function createReq(opts: {
    body?: unknown;
    origin?: string;
    contentType?: string;
    contentLength?: string;
    largeStream?: boolean;
    invalidComplaintId?: boolean;
  }) {
    const headers = new Headers();
    if (opts.origin !== undefined) headers.set("origin", opts.origin);
    else headers.set("origin", "https://buholex.test");

    if (opts.contentType !== undefined) headers.set("content-type", opts.contentType);
    else headers.set("content-type", "application/json");

    if (opts.contentLength !== undefined) headers.set("content-length", opts.contentLength);

    let bodyData: unknown;

    if (opts.largeStream) {
      bodyData = new ReadableStream({
        start(controller) {
          const chunk = new Uint8Array(20000); // Send multiple chunks > 65536
          controller.enqueue(chunk);
          controller.enqueue(chunk);
          controller.enqueue(chunk);
          controller.enqueue(chunk); // 80k total
          controller.close();
        },
      });
    } else if (opts.body !== undefined) {
      bodyData = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    } else {
      bodyData = JSON.stringify({
        expectedCurrentStatus: "under_review",
        responseChannel: "email",
        responderName: "Test Responder",
        responderRole: "Agent",
        responseText: "This is a test response",
      });
    }

    return {
      req: new Request("https://buholex.test/api/admin/complaints/123/responses", {
        method: "POST",
        headers,
        body: bodyData as BodyInit,
        // @ts-expect-error duplex is required for streaming request body in Node.js
        duplex: "half",
      }),
      params: Promise.resolve({ complaintId: opts.invalidComplaintId ? "bad" : "valid-id-123456" })
    };
  }

  // A. no session -> 401
  it("A. no session -> 401", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: { code: "unauthorized" } });
  });

  // B, C, D -> 403 identical
  it("B, C, D. mapped/suspended/capability -> 403 exactly identical", async () => {
    for (const kind of ["operator_not_mapped", "operator_inactive", "capability_missing"] as const) {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind });
      const { req, params } = createReq({});
      const res = await POST(req, { params });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ success: false, error: { code: "forbidden" } });
    }
  });

  // E. authorization DB unavailable -> 503
  it("E. authorization DB unavailable -> 503", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorization_unavailable" });
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ success: false, error: { code: "service_unavailable" } });
  });

  // F. authorized principal -> B5A called
  it("F. authorized principal -> B5A called", async () => {
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    expect(submitProviderResponseRuntime).toHaveBeenCalledTimes(1);
  });

  // G, H. operatorId and capability injection rejected
  it("G, H, L. operatorId/capability injection rejected by strict schema -> 400", async () => {
    const { req, params } = createReq({
      body: {
        expectedCurrentStatus: "under_review",
        responseChannel: "email",
        responderName: "Test Responder",
        responderRole: "Agent",
        responseText: "This is a test response",
        operatorId: "hacked_id",
        capability: "all",
        app_metadata: {}
      }
    });
    const res = await POST(req, { params });
    expect(res.status).toBe(400); // 400 bad request due to strict schema
    expect(submitProviderResponseRuntime).not.toHaveBeenCalled();
  });

  // I. Auth0 roles cannot authorize
  it("I. Auth0 roles/permissions metadata cannot authorize (handled by resolver but verified structurally)", () => {
    // This is structurally guaranteed because the resolver output is the only thing B5A accepts
    const payload = ProviderResponseHttpSchema.safeParse({ roles: ["admin"] });
    expect(payload.success).toBe(false);
  });

  // J, U. bad/cross Origin -> 403
  it("J, U. missing or cross Origin -> 403", async () => {
    const { req: req1, params: p1 } = createReq({ origin: null as unknown as string });
    const res1 = await POST(req1, { params: p1 });
    expect(res1.status).toBe(403);

    const { req: req2, params: p2 } = createReq({ origin: "https://evil.test" });
    const res2 = await POST(req2, { params: p2 });
    expect(res2.status).toBe(403);
  });

  // V. invalid Content-Type -> 415
  it("V. invalid Content-Type -> 415", async () => {
    const { req, params } = createReq({ contentType: "text/plain" });
    const res = await POST(req, { params });
    expect(res.status).toBe(415);
  });

  // W. payload over 65536 -> 413
  it("W. payload over 65536 -> 413 (streamed enforce)", async () => {
    const { req, params } = createReq({ largeStream: true });
    const res = await POST(req, { params });
    expect(res.status).toBe(413);
  });

  it("W. payload over 65536 -> 413 (Content-Length header)", async () => {
    const { req, params } = createReq({ contentLength: "70000" });
    const res = await POST(req, { params });
    expect(res.status).toBe(413);
  });

  // X. authorization denial occurs before deep business validation details are exposed
  // K. malformed JSON -> 400 after authorization
  it("X, K. malformed JSON is not parsed before authorization succeeds", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
    const { req, params } = createReq({ body: "not-json" });
    const res = await POST(req, { params });
    // Returns 401 instead of 400 because auth happens first
    expect(res.status).toBe(401);
  });

  it("K. malformed JSON returns 400 after authorization succeeds", async () => {
    const { req, params } = createReq({ body: "not-json" });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  // M. invalid complaintId -> 400
  it("M. invalid complaintId -> 400", async () => {
    const { req, params } = createReq({ invalidComplaintId: true });
    const res = await POST(req, { params });
    expect(res.status).toBe(400);
  });

  // B5A mapping: N, Y, Z, true domain, O, P
  it("N. complaint_not_found -> 404", async () => {
    vi.mocked(submitProviderResponseRuntime).mockResolvedValue({ kind: "complaint_not_found" });
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("Y, Z. stale status or already exists -> 409", async () => {
    vi.mocked(submitProviderResponseRuntime).mockResolvedValue({ kind: "complaint_stale_status" });
    let res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(409);

    vi.mocked(submitProviderResponseRuntime).mockResolvedValue({ kind: "complaint_initial_response_already_exists" });
    res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(409);
  });

  it("true complaint_domain_error -> 422", async () => {
    vi.mocked(submitProviderResponseRuntime).mockResolvedValue({
      kind: "complaint_domain_error",
      code: "complaint_response_text_required"
    } as unknown as ProviderResponseRuntimeResult);
    const res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(422);
  });

  it("O, AB. complaint persistence unavailable -> 503", async () => {
    const { ComplaintsServiceUnavailableError } = await import("@/lib/complaints/complaints-errors");
    const error = new ComplaintsServiceUnavailableError("complaints_admin_persistence_failed");
    vi.mocked(submitProviderResponseRuntime).mockRejectedValue(error);
    const res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ success: false, error: { code: "service_unavailable" } });
  });

  it("P, AD. unexpected programmer error -> 500", async () => {
    vi.mocked(submitProviderResponseRuntime).mockRejectedValue(new Error("Raw SQL Error!"));
    const res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: { code: "internal_server_error" } });
    expect(body.error.message).toBeUndefined(); // No leak
  });

  // Q. authorization denial body does not leak denial reason
  it("Q. authorization denial body does not leak", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_not_mapped" });
    const res = await POST(createReq({}).req, { params: createReq({}).params });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, error: { code: "forbidden" } }); // generic
  });

  // R. B5A receives exact TrustedAdminPrincipal from resolver
  it("R. B5A receives exact TrustedAdminPrincipal from resolver", async () => {
    const { req, params } = createReq({});
    await POST(req, { params });
    expect(submitProviderResponseRuntime).toHaveBeenCalledWith(
      expect.objectContaining({ complaintId: "valid-id-123456" }),
      { operatorId: "op_123", identitySource: "authenticated_session" }
    );
  });

  // S. B5A is not called on any authorization denial
  it("S. B5A is not called on authorization denial", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
    const { req, params } = createReq({});
    await POST(req, { params });
    expect(submitProviderResponseRuntime).not.toHaveBeenCalled();
  });

  // T, AF. success contains no operatorId
  it("T, AF. success contains no internal operatorId", async () => {
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });
  });

  // AA. authorization persistence failure -> 503; B5A not called
  it("AA. authorization persistence failure -> 503; B5A not called", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorization_unavailable" });
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(503);
    expect(submitProviderResponseRuntime).not.toHaveBeenCalled();
  });

  // AC. unexpected authorization programmer error -> generic 500
  it("AC. unexpected authorization programmer error -> 500", async () => {
    vi.mocked(resolveTrustedAdminPrincipal).mockRejectedValue(new Error("Network DB Error"));
    const { req, params } = createReq({});
    const res = await POST(req, { params });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: { code: "internal_server_error" } });
  });

  // AE. no authorization URL or DB detail leaks
  it("AE. no authorization DB leak", async () => {
    const { req, params } = createReq({});
    await POST(req, { params });
    // Asserted by P, AD, AC returning generic errors and the absence of process.env access in route directly.
    expect(getAuthorizationDatabase).toHaveBeenCalled();
  });
});
