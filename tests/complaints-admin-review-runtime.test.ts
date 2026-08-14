import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/database/client", () => ({
  getComplaintsAdminDatabase: vi.fn(() => ({ transaction: vi.fn(), select: vi.fn() })),
}));
vi.mock("@/database/adapters/complaints-postgres.adapter", () => ({
  createComplaintsAdminPersistenceAdapter: vi.fn(() => ({})),
}));
vi.mock("@/database/repositories/complaints.repository", () => ({
  createComplaintsAdminRepository: vi.fn(() => ({
    startComplaintReview: vi.fn(),
  })),
}));
vi.mock("@/lib/complaints/complaints-admin-http-runtime", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/complaints/complaints-admin-http-runtime")>();
  return {
    ...mod,
    authorizeAdminComplaintReview: vi.fn(),
  };
});

import { createComplaintsAdminRepository } from "@/database/repositories/complaints.repository";
import {
  ComplaintPersistenceError,
  SanitizedDatabaseConstraintError,
} from "@/database/repositories/complaints.errors";
import { startComplaintReviewRuntime, StartComplaintReviewRuntimeInput, TrustedAdminPrincipal } from "@/lib/complaints/complaints-admin-runtime";
import { ComplaintsServiceUnavailableError } from "@/lib/complaints/complaints-errors";
import { authorizeAdminComplaintReview } from "@/lib/complaints/complaints-admin-http-runtime";
import { POST } from "@/app/api/admin/complaints/[complaintId]/review/route";

describe("complaints-admin-review-runtime", () => {
  const baseInput: StartComplaintReviewRuntimeInput = {
    complaintId: "COMP-123",
    expectedCurrentStatus: "received",
  };

  const basePrincipal: TrustedAdminPrincipal = {
    operatorId: "admin-uuid",
    identitySource: "authenticated_session",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockResolvedValue({ kind: "success" })
    } as never);
  });

  it("C1. archivo contiene import 'server-only'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const content = await fs.readFile(path.join(__dirname, "../lib/complaints/complaints-admin-runtime.ts"), "utf-8");
    expect(content).toMatch(/import ['"]server-only['"]/);
  });

  it("C2. successful review", async () => {
    const result = await startComplaintReviewRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "success" });
  });

  it("C3. not found", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockResolvedValue({ kind: "complaint_not_found" })
    } as never);
    const result = await startComplaintReviewRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_not_found" });
  });

  it("C4. stale status", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockResolvedValue({ kind: "complaint_stale_status" })
    } as never);
    const result = await startComplaintReviewRuntime(baseInput, basePrincipal);
    expect(result).toEqual({ kind: "complaint_stale_status" });
  });

  it("C5. ComplaintPersistenceError wraps to service unavailable", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockRejectedValue(new ComplaintPersistenceError("complaint_transaction_failed"))
    } as never);

    await expect(startComplaintReviewRuntime(baseInput, basePrincipal)).rejects.toThrow(ComplaintsServiceUnavailableError);
  });

  it("C6. SanitizedDatabaseConstraintError wraps to service unavailable", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockRejectedValue(new SanitizedDatabaseConstraintError("23505", "unique"))
    } as never);

    await expect(startComplaintReviewRuntime(baseInput, basePrincipal)).rejects.toThrow(ComplaintsServiceUnavailableError);
  });
});

describe("complaints-admin-review-http-route", () => {
  const basePrincipal: TrustedAdminPrincipal = {
    operatorId: "admin-uuid",
    identitySource: "authenticated_session",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authorizeAdminComplaintReview).mockResolvedValue({
      kind: "authorized",
      principal: basePrincipal,
    });
  });

  const createJsonRequest = (body: object) => new Request("https://admin.buholex.com/api/admin/complaints/id/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "https://admin.buholex.com", "Host": "admin.buholex.com" },
    body: JSON.stringify(body),
  });

  it("H1. Rejects non-UUID 'abcdefgh' with 400", async () => {
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: "abcdefgh" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("bad_request");
  });

  it("H2. Rejects non-UUID 'complaint_test_123' with 400", async () => {
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: "complaint_test_123" }) });
    expect(res.status).toBe(400);
  });

  it("H3. Rejects non-UUID '12345678' with 400", async () => {
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: "12345678" }) });
    expect(res.status).toBe(400);
  });

  it("H4. Rejects non-UUID 'aaaaaaaaaaaaaaaa' with 400", async () => {
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: "aaaaaaaaaaaaaaaa" }) });
    expect(res.status).toBe(400);
  });

  it("H5. Rejects non-UUID '12345678-1234' with 400", async () => {
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: "12345678-1234" }) });
    expect(res.status).toBe(400);
  });

  it("H6. Accepts valid UUID", async () => {
    vi.mocked(createComplaintsAdminRepository).mockReturnValue({
      startComplaintReview: vi.fn().mockResolvedValue({ kind: "success" })
    } as never);
    
    const validUuid = "123e4567-e89b-42d3-a456-426614174000";
    const res = await POST(createJsonRequest({ expectedCurrentStatus: "received" }), { params: Promise.resolve({ complaintId: validUuid }) });
    expect(res.status).toBe(200);
  });
});
