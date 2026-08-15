import { describe, it, expect, vi } from "vitest";
import { executeAdminComplaintClose, CloseComplaintHttpSchema } from "@/lib/complaints/complaints-admin-http-runtime";
import * as runtime from "@/lib/complaints/complaints-admin-runtime";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn(),
}));
vi.mock("@/database/client", () => ({
  getAuthorizationDatabase: vi.fn(),
}));
vi.mock("@/database/repositories/authorization.repository", () => ({
  createAuthorizationRepository: vi.fn(),
}));
vi.mock("@/lib/complaints/complaints-admin-runtime", () => ({
  closeComplaintRuntime: vi.fn(),
}));

describe("CloseComplaintHttpSchema", () => {
  it("accepts valid payload", () => {
    const validPayload = { expectedCurrentStatus: "answered" };
    expect(CloseComplaintHttpSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects invalid expectedCurrentStatus", () => {
    const invalidPayload = { expectedCurrentStatus: "under_review" };
    expect(CloseComplaintHttpSchema.safeParse(invalidPayload).success).toBe(false);
  });

  it("rejects unknown properties", () => {
    const invalidPayload = { expectedCurrentStatus: "answered", otherProp: "value" };
    expect(CloseComplaintHttpSchema.safeParse(invalidPayload).success).toBe(false);
  });
});

describe("executeAdminComplaintClose", () => {
  it("maps payload and calls runtime", async () => {
    const mockRuntime = vi.mocked(runtime.closeComplaintRuntime);
    mockRuntime.mockResolvedValueOnce({ kind: "success" });

    const payload = { expectedCurrentStatus: "answered" as const };
    const principal = { operatorId: "op-1", identitySource: "authenticated_session" as const };

    const result = await executeAdminComplaintClose("c-123", payload, principal);

    expect(result.kind).toBe("success");
    expect(mockRuntime).toHaveBeenCalledWith(
      { complaintId: "c-123", expectedCurrentStatus: "answered" },
      principal
    );
  });
});
