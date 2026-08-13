import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/admin/complaints/[complaintId]/route";
import { getAdminComplaintDetailRepository } from "@/database/repositories/admin-complaint-detail-read.repository";
import * as fs from "fs";
import * as path from "path";

import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn().mockResolvedValue({ status: "authenticated", provider: "auth0", providerSubjectId: "auth0|sub" }),
}));

vi.mock("@/database/client", () => ({
  getAuthorizationDatabase: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/authorization/authorization-resolver", () => ({
  resolveTrustedAdminPrincipal: vi.fn(),
}));

vi.mock("@/database/repositories/admin-complaint-detail-read.repository", () => ({
  getAdminComplaintDetailRepository: vi.fn(),
}));

describe("Admin Complaint Detail Protected Read API (GET /api/admin/complaints/[complaintId])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidPrincipal = {
    operatorId: "operator-123",
    identitySource: "authenticated_session" as const,
  };

  const validId = "12345678-1234-1234-1234-123456789012";

  const createRequest = () => new Request(`https://admin.buholex.com/api/admin/complaints/${validId}`, { method: "GET" }) as unknown as import("next/server").NextRequest;

  describe("Authorization Flow", () => {
    it("1. unauthenticated -> 401", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(401);
    });

    it("2. complaints:read -> authorized", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({ kind: "not_found" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(404);
      expect(resolveTrustedAdminPrincipal).toHaveBeenCalledWith(expect.anything(), "complaints:read", expect.anything());
    });

    it("3. complaints:respond only -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(403);
    });

    it("4. no capability -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(403);
    });

    it("5. suspended -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_inactive" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(403);
    });

    it("6. unmapped -> denial", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_not_mapped" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(403);
    });

    it("7. auth persistence unavailable -> 503", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorization_unavailable" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(503);
    });
  });

  describe("Path / HTTP / Routing", () => {
    beforeEach(() => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
    });

    it("11. malformed UUID -> 400", async () => {
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: "invalid-uuid" }) });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "malformed_identifier" });
    });

    it("12. valid absent UUID -> 404", async () => {
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({ kind: "not_found" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(404);
    });

    it("14/15. no-store on all responses", async () => {
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({ kind: "not_found" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.headers.get("Cache-Control")).toContain("no-store");

      const res400 = await GET(createRequest(), { params: Promise.resolve({ complaintId: "invalid" }) });
      expect(res400.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  describe("Database Boundaries", () => {
    it("19. dedicated detail DB only", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaint-detail-read.repository.ts"), "utf-8");
      expect(repoSource).toContain("getComplaintsAdminDetailReadDatabase");
      expect(repoSource).not.toContain("getComplaintsAdminDatabase");
    });

    it("21/22/23. safe view sources only, no base tables", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaint-detail-read.repository.ts"), "utf-8");
      expect(repoSource).toContain("admin_complaint_detail_safe");
      expect(repoSource).toContain("admin_complaint_current_response_safe");
      expect(repoSource).toContain("admin_complaint_status_timeline_safe");

      expect(repoSource).not.toContain("FROM complaints_private.complaints");
      expect(repoSource).not.toContain("FROM complaints_private.complaint_provider_responses");
      expect(repoSource).not.toContain("FROM complaints_private.complaint_status_history");
    });

    it("25/26. no payload_snapshot, no SELECT *", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaint-detail-read.repository.ts"), "utf-8");
      expect(repoSource).not.toContain("payload_snapshot");
      expect(repoSource).not.toContain("SELECT *");
    });

    it("27. all queries under detail role wrapper", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaint-detail-read.repository.ts"), "utf-8");
      expect(repoSource).toContain("withComplaintsAdminDetailReadRole");
    });
  });

  describe("Data Contract", () => {
    beforeEach(() => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
    });

    const validSafeRow = {
      id: validId,
      schema_version: "1.0",
      sheet_number: "LR-1",
      status: "received",
      submitted_at: new Date("2023-01-01T00:00:00Z"),
      deadline_at: new Date("2023-01-15T00:00:00Z"),
      closed_at: null,
      consumer_type: "individual",
      consumer_first_names: "John",
      consumer_last_names: "Doe",
      consumer_legal_name: null,
      consumer_representative_first_names: null,
      consumer_representative_last_names: null,
      consumer_representative_role: null,
      consumer_representative_relationship: null,
      subject_kind: "product",
      subject_description: "Desc",
      subject_amount_applicability: "applicable",
      subject_amount: "100.00",
      subject_currency: "USD",
      subject_transaction_date: "2022-12-01",
      subject_reference_number: null,
      subject_channel: "online",
      complaint_kind: "defect",
      complaint_facts: "Facts",
      complaint_requested_resolution: "Refund",
    };

    it("32/33. schemaVersion not returned, unsupported -> 500", async () => {
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
        kind: "success",
        complaint: { ...validSafeRow, schema_version: "2.0" },
        providerResponse: null,
        timeline: [],
      });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(500);

      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
        kind: "success",
        complaint: validSafeRow,
        providerResponse: null,
        timeline: [],
      });
      const resValid = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      const data = await resValid.json();
      expect(data.schemaVersion).toBeUndefined();
      expect(data.complaint.schemaVersion).toBeUndefined();
    });

    it("38/39/40. providerResponse null, duplicate -> 500", async () => {
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({ kind: "duplicate_response" });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(500);
    });

    it("34. required null -> 500", async () => {
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
        kind: "success",
        complaint: { ...validSafeRow, complaint_facts: null as unknown as string },
        providerResponse: null,
        timeline: [],
      });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(500);
    });

    it("double-stringified invalid-data regression: projection fields become null -> 500", async () => {
      // In the database, if payload_snapshot is a double-stringified JSON, the nested ->> paths return NULL.
      // This test proves that the route rejects such rows as invalid state instead of crashing or blessing them.
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
        kind: "success",
        complaint: {
          ...validSafeRow,
          consumer_type: null as unknown as string,
          subject_kind: null as unknown as string,
          complaint_facts: null as unknown as string
        },
        providerResponse: null,
        timeline: [],
      });
      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: "internal_server_error" });
    });

    it("18. Contract Test - synthetic payload maps to response", async () => {
      // The API receives the safe row already flattened by the DB projection.
      // So this asserts that the route handler maps the flattened row back to the nested contract.
      vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
        kind: "success",
        complaint: {
          ...validSafeRow,
          consumer_type: "natural_person",
          consumer_first_names: "Jane",
          consumer_last_names: "Doe",
          consumer_representative_first_names: "John",
          consumer_representative_last_names: "Smith",
          consumer_representative_role: "Parent",
          subject_kind: "service",
          complaint_kind: "claim",
          complaint_facts: "Tested facts",
        },
        providerResponse: null,
        timeline: [],
      });

      const res = await GET(createRequest(), { params: Promise.resolve({ complaintId: validId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.complaint.consumer.consumerType).toBe("natural_person");
      expect(data.complaint.consumer.firstNames).toBe("Jane");
      expect(data.complaint.consumer.representative.firstNames).toBe("John");
      expect(data.complaint.subject.kind).toBe("service");
      expect(data.complaint.details.kind).toBe("claim");
      expect(data.complaint.details.facts).toBe("Tested facts");
    });
  });
});
