import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "../app/api/admin/complaints/[complaintId]/resume-review/route";
import * as runtimeModule from "../lib/complaints/complaints-admin-runtime";
import * as authModule from "../lib/complaints/complaints-admin-http-runtime";

vi.mock("../lib/complaints/complaints-admin-runtime", () => ({
  resumeComplaintReviewRuntime: vi.fn(),
}));

vi.mock("../lib/complaints/complaints-admin-http-runtime", () => ({
  authorizeAdminComplaintResumeReview: vi.fn(),
  ResumeComplaintReviewHttpSchema: {
    safeParse: vi.fn(),
  },
}));

describe("Complaints Admin Resume Review Route", () => {
  const validComplaintId = "123e4567-e89b-12d3-a456-426614174000";
  const validPayload = {
    expectedCurrentStatus: "awaiting_information",
    returnNote: "Information looks good",
  };

  const createRequest = (body: unknown, overrides: RequestInit = {}) => {
    return new Request(`http://localhost:3000/api/admin/complaints/${validComplaintId}/resume-review`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": "http://localhost:3000",
        "host": "localhost:3000",
        ...overrides.headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.authorizeAdminComplaintResumeReview).mockResolvedValue({
      kind: "authorized",
      principal: { operatorId: "op_123", identitySource: "authenticated_session" },
    });
    vi.mocked(authModule.ResumeComplaintReviewHttpSchema.safeParse).mockReturnValue({
      success: true,
      data: validPayload,
    } as ReturnType<typeof authModule.ResumeComplaintReviewHttpSchema.safeParse>);
  });

  it("should return 200 on success", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "success" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ success: true });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("should return 400 for invalid UUID", async () => {
    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: "invalid-uuid" }) });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: { code: "bad_request" } });
  });

  it("should return 401 if unauthenticated", async () => {
    vi.mocked(authModule.authorizeAdminComplaintResumeReview).mockResolvedValue({ kind: "unauthenticated" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(401);
  });

  it("should return 403 if capability missing", async () => {
    vi.mocked(authModule.authorizeAdminComplaintResumeReview).mockResolvedValue({ kind: "capability_missing" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(403);
  });

  it("should return 404 if not found", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "complaint_not_found" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(404);
  });

  it("should return 409 if stale status", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "complaint_stale_status" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ success: false, error: { code: "conflict" } });
  });

  it("should return 409 if no open request exists", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "complaint_no_open_information_request" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ success: false, error: { code: "conflict" } });
  });

  it("should return 409 if multiple open requests exist", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "complaint_multiple_open_information_requests" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ success: false, error: { code: "conflict" } });
  });

  it("should return 422 if text is required", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "complaint_resume_review_note_required" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    expect(res.status).toBe(422);
  });

  it("should not expose internal ids or PII on success", async () => {
    vi.mocked(runtimeModule.resumeComplaintReviewRuntime).mockResolvedValue({ kind: "success" });

    const req = createRequest(validPayload);
    const res = await POST(req, { params: Promise.resolve({ complaintId: validComplaintId }) });

    const data = await res.json();
    expect(data.operatorId).toBeUndefined();
    expect(data.auditId).toBeUndefined();
    expect(data.returnNote).toBeUndefined();
    expect(data.receivedBy).toBeUndefined();
  });
});
