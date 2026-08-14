import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getAdminComplaintDetailRuntime } from "@/lib/complaints/complaints-admin-detail-read-runtime";
import { getAdminComplaintDetailRepository } from "@/database/repositories/admin-complaint-detail-read.repository";
import { TrustedAdminPrincipal } from "@/lib/complaints/complaints-admin-runtime";

vi.mock("server-only", () => ({}));

vi.mock("@/database/repositories/admin-complaint-detail-read.repository", () => ({
  getAdminComplaintDetailRepository: vi.fn(),
}));

describe("D.3-A.2 - Admin Information Requests DB Foundation", () => {
  it("MIGRATION - Contains proper table definition, view, and role grants", () => {
    const migrationsDir = path.join(process.cwd(), "database", "migrations");
    const migrationFile = fs.readdirSync(migrationsDir).find(f => f.includes("0015_"));
    expect(migrationFile).toBeDefined();

    const sqlContent = fs.readFileSync(path.join(migrationsDir, migrationFile!), "utf8");

    // Table definition
    expect(sqlContent).toContain('CREATE TABLE "complaints_private"."complaint_information_requests"');
    expect(sqlContent).toContain('"request_sequence" integer NOT NULL');
    expect(sqlContent).toContain('"request_text" varchar(2000) NOT NULL');

    // Invariants
    expect(sqlContent).toContain('CONSTRAINT "complaint_information_requests_comp_seq_idx" UNIQUE("complaint_id","request_sequence")');
    expect(sqlContent).toContain('CONSTRAINT "lifecycle_consistency" CHECK');
    expect(sqlContent).toContain('CREATE UNIQUE INDEX "complaint_information_requests_comp_open_idx" ON "complaints_private"."complaint_information_requests" USING btree ("complaint_id") WHERE "complaints_private"."complaint_information_requests"."status" = \'open\'');

    // Safe View
    expect(sqlContent).toContain("CREATE VIEW complaints_private.admin_complaint_information_requests_safe AS");
    const viewDefinition = sqlContent.split("--> statement-breakpoint").find(s => s.includes("CREATE VIEW complaints_private.admin_complaint_information_requests_safe AS"));
    expect(viewDefinition).toBeDefined();
    expect(viewDefinition).not.toContain("requested_by");
    expect(viewDefinition).not.toContain("received_by");

    // Role Grants
    expect(sqlContent).toContain("GRANT SELECT ON complaints_private.admin_complaint_information_requests_safe TO complaints_admin_detail_read_runtime");
    expect(sqlContent).toContain("GRANT SELECT, INSERT ON complaints_private.complaint_information_requests TO complaints_admin_runtime");
    expect(sqlContent).toContain("GRANT UPDATE (status, return_note, received_at, received_by) ON complaints_private.complaint_information_requests TO complaints_admin_runtime");
    expect(sqlContent).not.toContain("GRANT DELETE");
  });

  it("SAFE DETAIL CONTRACT - Renders information requests correctly", async () => {
    const mockPrincipal: TrustedAdminPrincipal = {
      operatorId: "op-1",
      identitySource: "service_context"
    };

    vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
      kind: "success",
      complaint: {
        id: "comp-1",
        schema_version: "1.0",
        sheet_number: "SH-1",
        status: "under_review",
        submitted_at: "2026-08-01T10:00:00Z",
        deadline_at: "2026-08-15",
        closed_at: null,
        consumer_type: "individual",
        consumer_first_names: "Jane",
        consumer_last_names: "Doe",
        consumer_legal_name: null,
        consumer_representative_first_names: null,
        consumer_representative_last_names: null,
        consumer_representative_role: null,
        consumer_representative_relationship: null,
        subject_kind: "billing",
        subject_description: "Overcharged",
        subject_amount_applicability: "applicable",
        subject_amount: "100",
        subject_currency: "MXN",
        subject_transaction_date: null,
        subject_reference_number: null,
        subject_channel: null,
        complaint_kind: "service",
        complaint_facts: "I was overcharged.",
        complaint_requested_resolution: "Refund."
      },
      providerResponse: null,
      timeline: [],
      informationRequests: [
        {
          complaint_id: "comp-1",
          request_sequence: 1,
          request_text: "Please provide evidence.",
          requested_at: "2026-08-02T10:00:00Z",
          status: "received",
          return_note: "Here is the evidence.",
          received_at: "2026-08-03T10:00:00Z"
        },
        {
          complaint_id: "comp-1",
          request_sequence: 2,
          request_text: "Need more evidence.",
          requested_at: "2026-08-04T10:00:00Z",
          status: "open",
          return_note: null,
          received_at: null
        }
      ]
    });

    const result = await getAdminComplaintDetailRuntime("comp-1", mockPrincipal);
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.data.informationRequests!).toHaveLength(2);
      const req0 = result.data.informationRequests[0]!;
      const req1 = result.data.informationRequests[1]!;
      expect(req0.requestSequence).toBe(1);
      expect(req0.status).toBe("received");
      expect(req0.receivedAt).toBe("2026-08-03T10:00:00.000Z");
      expect(req1.status).toBe("open");
      expect(req1.returnNote).toBeNull();
    }
  });

  it("MALFORMED DATA - Rejects unknown status", async () => {
    const mockPrincipal: TrustedAdminPrincipal = {
      operatorId: "op-1",
      identitySource: "service_context"
    };

    vi.mocked(getAdminComplaintDetailRepository).mockResolvedValue({
      kind: "success",
      complaint: {
        id: "comp-1",
        schema_version: "1.0",
        sheet_number: "SH-1",
        status: "under_review",
        submitted_at: "2026-08-01T10:00:00Z",
        deadline_at: "2026-08-15",
        closed_at: null,
        consumer_type: "individual",
        consumer_first_names: "Jane",
        consumer_last_names: "Doe",
        consumer_legal_name: null,
        consumer_representative_first_names: null,
        consumer_representative_last_names: null,
        consumer_representative_role: null,
        consumer_representative_relationship: null,
        subject_kind: "billing",
        subject_description: "Overcharged",
        subject_amount_applicability: "applicable",
        subject_amount: "100",
        subject_currency: "MXN",
        subject_transaction_date: null,
        subject_reference_number: null,
        subject_channel: null,
        complaint_kind: "service",
        complaint_facts: "I was overcharged.",
        complaint_requested_resolution: "Refund."
      },
      providerResponse: null,
      timeline: [],
      informationRequests: [
        {
          complaint_id: "comp-1",
          request_sequence: 1,
          request_text: "Please provide evidence.",
          requested_at: "2026-08-02T10:00:00Z",
          status: "unknown_status_from_db", // invalid
          return_note: null,
          received_at: null
        }
      ]
    });

    const result = await getAdminComplaintDetailRuntime("comp-1", mockPrincipal);
    expect(result.kind).toBe("invalid_state");
    if (result.kind === "invalid_state") {
      expect(result.reason).toBe("invalid_information_request_status");
    }
  });
});
