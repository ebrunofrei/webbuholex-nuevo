import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { requestComplaintInformationRuntime, RequestComplaintInformationRuntimeInput } from "../lib/complaints/complaints-admin-runtime";
import { ComplaintsServiceUnavailableError } from "../lib/complaints/complaints-errors";
import { ComplaintPersistenceError } from "../database/repositories/complaints.errors";
import type { TrustedAdminPrincipal } from "../lib/complaints/complaints-admin-runtime";

// Mock dependencies
const mockRequestComplaintInformation = vi.fn();

vi.mock("../database/client", () => ({
  getComplaintsAdminDatabase: vi.fn(() => ({})),
}));

vi.mock("../database/adapters/complaints-postgres.adapter", () => ({
  createComplaintsAdminPersistenceAdapter: vi.fn(() => ({})),
}));

vi.mock("../database/repositories/complaints.repository", () => ({
  createComplaintsAdminRepository: vi.fn(() => ({
    requestComplaintInformation: mockRequestComplaintInformation,
  })),
}));

describe("Complaints Admin Request Information Runtime", () => {
  const principal: TrustedAdminPrincipal = {
    operatorId: "op_123",
    identitySource: "authenticated_session",
  };

  const validInput: RequestComplaintInformationRuntimeInput = {
    complaintId: "123e4567-e89b-12d3-a456-426614174000",
    expectedCurrentStatus: "under_review",
    requestText: "Please provide more details.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return success when repository succeeds", async () => {
    mockRequestComplaintInformation.mockResolvedValueOnce({ kind: "success" });

    const result = await requestComplaintInformationRuntime(validInput, principal);
    expect(result).toEqual({ kind: "success" });
    expect(mockRequestComplaintInformation).toHaveBeenCalledWith({
      complaintId: validInput.complaintId,
      expectedCurrentStatus: "under_review",
      requestText: "Please provide more details.",
      operatorId: "op_123",
    });
  });

  it("should trim requestText and reject blank text", async () => {
    const input = { ...validInput, requestText: "   \n  " };
    const result = await requestComplaintInformationRuntime(input, principal);
    expect(result).toEqual({ kind: "complaint_request_information_text_required" });
    expect(mockRequestComplaintInformation).not.toHaveBeenCalled();
  });

  it("should reject text longer than 2000 chars", async () => {
    const input = { ...validInput, requestText: "A".repeat(2001) };
    const result = await requestComplaintInformationRuntime(input, principal);
    expect(result).toEqual({ kind: "complaint_request_information_text_too_long" });
    expect(mockRequestComplaintInformation).not.toHaveBeenCalled();
  });

  it("should propagate stale status error from repository", async () => {
    mockRequestComplaintInformation.mockResolvedValueOnce({ kind: "complaint_stale_status" });
    const result = await requestComplaintInformationRuntime(validInput, principal);
    expect(result).toEqual({ kind: "complaint_stale_status" });
  });

  it("should propagate open request exists error from repository", async () => {
    mockRequestComplaintInformation.mockResolvedValueOnce({ kind: "complaint_open_information_request_exists" });
    const result = await requestComplaintInformationRuntime(validInput, principal);
    expect(result).toEqual({ kind: "complaint_open_information_request_exists" });
  });

  it("should throw ComplaintsServiceUnavailableError for persistence errors", async () => {
    mockRequestComplaintInformation.mockRejectedValueOnce(
      new ComplaintPersistenceError("complaint_transaction_failed")
    );
    await expect(requestComplaintInformationRuntime(validInput, principal)).rejects.toThrow(
      ComplaintsServiceUnavailableError
    );
  });
});
