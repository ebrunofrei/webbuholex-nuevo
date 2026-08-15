import { describe, it, expect, vi } from "vitest";
import { closeComplaintRuntime, type CloseComplaintRuntimeInput } from "@/lib/complaints/complaints-admin-runtime";
import { ComplaintsServiceUnavailableError } from "@/lib/complaints/complaints-errors";
import { createComplaintPersistenceError } from "@/database/repositories/complaints.errors";

vi.mock("server-only", () => ({}));

vi.mock("@/database/client", () => ({
  getComplaintsAdminDatabase: vi.fn(() => ({})),
}));

vi.mock("@/database/adapters/complaints-postgres.adapter", () => ({
  createComplaintsAdminPersistenceAdapter: vi.fn(() => ({})),
}));

const mockCloseComplaint = vi.fn();

vi.mock("@/database/repositories/complaints.repository", () => ({
  createComplaintsAdminRepository: vi.fn(() => ({
    closeComplaint: mockCloseComplaint,
  })),
}));

describe("closeComplaintRuntime", () => {
  const baseInput: CloseComplaintRuntimeInput = {
    complaintId: "c-123",
    expectedCurrentStatus: "answered",
  };

  const principal = {
    operatorId: "op-1",
    identitySource: "authenticated_session" as const,
  };

  it("returns success when repository returns success", async () => {
    mockCloseComplaint.mockResolvedValueOnce({ kind: "success" });

    const result = await closeComplaintRuntime(baseInput, principal);
    expect(result.kind).toBe("success");
    expect(mockCloseComplaint).toHaveBeenCalledWith({
      complaintId: "c-123",
      expectedCurrentStatus: "answered",
      operatorId: "op-1",
    });
  });

  it("returns complaint_not_found when repository returns complaint_not_found", async () => {
    mockCloseComplaint.mockResolvedValueOnce({ kind: "complaint_not_found" });

    const result = await closeComplaintRuntime(baseInput, principal);
    expect(result.kind).toBe("complaint_not_found");
  });

  it("returns complaint_stale_status when repository returns complaint_stale_status", async () => {
    mockCloseComplaint.mockResolvedValueOnce({ kind: "complaint_stale_status" });

    const result = await closeComplaintRuntime(baseInput, principal);
    expect(result.kind).toBe("complaint_stale_status");
  });

  it("throws ComplaintsServiceUnavailableError when repository throws persistence error", async () => {
    mockCloseComplaint.mockRejectedValueOnce(createComplaintPersistenceError("complaint_transaction_failed"));

    await expect(closeComplaintRuntime(baseInput, principal)).rejects.toThrow(ComplaintsServiceUnavailableError);
  });
});
